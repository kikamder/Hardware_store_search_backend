import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prismaClient from '../configs/prismaClient.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
 
// ⚠️ pool/adapter ตัวนี้ยังไม่ได้ถูกใช้เชื่อมกับ PrismaClient ตัวไหนเลย
// (prismaClient ที่ import มาด้านบนถูกสร้างไว้แล้วในไฟล์ configs/prismaClient.js)
// เก็บไว้เผื่อจะใช้ในอนาคต แต่ตอนนี้เป็น dead code — ถ้าไม่ได้ใช้จริงแนะนำให้ลบทิ้ง
const connectionString = process.env.DATABASE_URL;
const { Pool } = pg;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
 
class AuthService {
  /**
   * Dependency Injection เหมือนกับ AuthController
   * เพื่อให้ mock ได้ตอนเทส (เช่น mock OAuth2Client เพื่อไม่ต้องยิง Google จริง)
   */
  constructor({
    prisma = prismaClient,
    jwtLib = jwt,
    googleClientId = process.env.GOOGLE_CLIENT_ID,
    jwtSecret = process.env.JWT_SECRET,
    accessTokenTTL = '1h',
    refreshTokenTTL = '7d',
  } = {}) {
    this.prisma = prisma;
    this.jwt = jwtLib;
    this.jwtSecret = jwtSecret;
    this.accessTokenTTL = accessTokenTTL;
    this.refreshTokenTTL = refreshTokenTTL;
    this.oauthClient = new OAuth2Client(googleClientId);
    this.googleClientId = googleClientId;
 
    this.verifyGoogleToken = this.verifyGoogleToken.bind(this);
  }
 
  // ---------- Private helpers ----------
 
  async #verifyGoogleIdToken(googleToken) {
    const ticket = await this.oauthClient.verifyIdToken({
      idToken: googleToken,
      audience: this.googleClientId,
    });
    return ticket.getPayload();
  }
 
  async #findOrCreateUser(payload) {
    const { email, name, picture } = payload;
 
    let user = await this.prisma.user.findUnique({ where: { email } });
 
    if (user) {
      // 🟢 มี User อยู่แล้ว (ล็อกอินซ้ำ) -> อัปเดตข้อมูลล่าสุดจาก Google
      user = await this.prisma.user.update({
        where: { email },
        data: {
          displayName: name,
          profilePicture: picture,
        },
      });
    } else {
      // 🔵 ยังไม่มี User -> สร้างใหม่ (Auto Register)
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: name,
          profilePicture: picture,
          userRole: 'CUSTOMER',
          userStatus: 'ACTIVE',
        },
      });
    }
 
    return user;
  }
 
  #signAccessToken(user) {
    return this.jwt.sign(
      { userId: user.userId, role: user.userRole },
      this.jwtSecret,
      { expiresIn: this.accessTokenTTL }
    );
  }
 
  #signRefreshToken(user) {
    // หมายเหตุ: ในระบบใหญ่ๆ นิยมตั้ง Secret แยกอีกตัวสำหรับ Refresh Token
    return this.jwt.sign(
      { userId: user.userId },
      this.jwtSecret,
      { expiresIn: this.refreshTokenTTL }
    );
  }
 
  async #persistRefreshToken(userId, refreshToken) {
    return this.prisma.user.update({
      where: { userId },
      data: { refreshToken },
    });
  }
 
  // ---------- Public API ----------
 
  async verifyGoogleToken(googleToken) {
    // 1. ตรวจสอบกับ Google ว่า Token ของจริงไหม
    const payload = await this.#verifyGoogleIdToken(googleToken);
 
    // 2-3. เช็ค/สร้าง user ในระบบเรา
    const user = await this.#findOrCreateUser(payload);
 
    // 4-5. ออก Access Token (สั้น) และ Refresh Token (ยาว)
    const accessToken = this.#signAccessToken(user);
    const refreshToken = this.#signRefreshToken(user);
 
    // เก็บ refreshToken ล่าสุดลง DB
    await this.#persistRefreshToken(user.userId, refreshToken);
 
    // 6. ส่ง Token กลับไปทั้ง 2 ตัว
    return { user, accessToken, refreshToken };
  }
}
 
export { AuthService };
export default new AuthService();