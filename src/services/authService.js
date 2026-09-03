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
 

const connectionString = process.env.DATABASE_URL;
const { Pool } = pg;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
 
class AuthService {
  
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
      user = await this.prisma.user.update({
        where: { email },
        data: {
          displayName: name,
          profilePicture: picture,
        },
      });
    } else {
      
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