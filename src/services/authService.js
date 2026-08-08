import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

// 1. Import ตัว Prisma และ Adapter เข้ามา (เปลี่ยนจาก require เป็น import)
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// 2. ตั้งค่า Adapter โดยดึง URL จากไฟล์ .env
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// 3. สร้าง prisma client โดยยัด adapter ใส่เข้าไปด้วย
const prisma = new PrismaClient({ adapter });

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  async verifyGoogleToken(googleToken) {
    // 1. ตรวจสอบกับ Google ว่า Token ของจริงไหม
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    // 2. เช็คในระบบเราว่ามีอีเมลนี้หรือยัง
    let user = await prisma.user.findUnique({
      where: { email: email }
    });

    // 3. ถ้ายังไม่มีให้สร้าง User ใหม่ (Auto Register)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          displayName: name,
          userRole: 'CUSTOMER', // ค่าเริ่มต้นตาม Enum
          userStatus: 'ACTIVE'  // ค่าเริ่มต้นตาม Enum
        }
      });
    }

    // 4. สร้าง Access Token (อายุสั้น 1 ชั่วโมง สำหรับใช้ยืนยันตัวตน)
    const accessToken = jwt.sign(
      { userId: user.userId, role: user.userRole },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } 
    );

    // 5. สร้าง Refresh Token (อายุยาว 7 วัน สำหรับขอ Access Token ใหม่)
    // หมายเหตุ: ส่วนใหญ่ Refresh Token จะไม่เก็บข้อมูลเยอะ เก็บแค่ ID ก็พอ
    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_SECRET, // (ในระบบใหญ่ๆ นิยมตั้งรหัส Secret แยกอีกตัวสำหรับ Refresh ครับ)
      { expiresIn: '7d' }
    );

    // 6. ส่ง Token กลับไปทั้ง 2 ตัว
    return { user, accessToken, refreshToken };
  }
}

// เปลี่ยนจาก module.exports เป็น export default
export default new AuthService();