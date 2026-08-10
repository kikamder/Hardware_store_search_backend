import authService from '../services/authService.js';
import prisma from '../configs/prismaClient.js';
import jwt from 'jsonwebtoken';

class AuthController {
  async googleLogin(req, res) {
    try {
      // รับค่า Token ที่เพื่อนโยนมาจากหน้าเว็บ
      const { googleToken } = req.body || {};
      
      if (!googleToken) {
        return res.status(400).json({ error: 'Missing Google Token' });
      }

      // ส่งไปให้ Service จัดการ
      const result = await authService.verifyGoogleToken(googleToken);
      
      // ส่งข้อมูล User และ JWT กลับไปให้หน้าเว็บ
      res.status(200).json({
        status: 'success',
        message: 'Login Successful',
        data: {
          accessToken: result.accessToken,  
          refreshToken: result.refreshToken,
          user : { 
            user: result.user
          }
        }
      });
    } catch (error) {
      console.error('Google OAuth Error:', error);
      res.status(401).json({ error: 'Invalid or Expired Google Token' });
    }
  }

    // ใน authController.js
  async getMe(req, res) {
    try {
      // req.user จะได้มาจาก Middleware ที่เราใช้ถอดรหัส JWT ครับ
      const userId = req.user.userId; 

      // ดึงข้อมูล User จาก Database
      const user = await prisma.users.findUnique({
        where: { userId: userId },
        select: {
          userId: true,
          email: true,
          displayName: true,
          userRole: true,
          // (ไม่ต้องดึงรหัสผ่านหรือข้อมูลลับมานะครับ)
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ user });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
    async logout(req, res){
        try {
          const { refreshToken } = req.body || {};

          if (!refreshToken) {
           return res.status(400).json({ error: 'No refresh token provided' });
          } 

         // 🟢 ค้นหาว่า Token นี้เป็นของใคร แล้วสั่งเปลี่ยนคอลัมน์นั้นให้เป็น null (ค่าว่าง)
         // การใช้ updateMany จะช่วยป้องกัน Error กรณีหา Token ไม่เจอครับ
          await prisma.user.updateMany({
            where: { 
              refreshToken: refreshToken // หา User ที่มี Token นี้ถืออยู่
            },
            data: { 
              refreshToken: null // ล้างค่าทิ้งให้เป็น null (ทำลายบัตรประชาชน)
            }
          });

          res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout Error:', error);
            res.status(500).json({ error: 'Internal server error during logout' });
          }
      };
   async refreshToken (req, res){
      try {
        // 1. รับ Refresh Token ที่ Frontend ส่งมา
        const { refreshToken } = req.body;

        if (!refreshToken) {
          return res.status(401).json({ error: 'No refresh token provided' });
        }

        // 2. ถอดรหัสเพื่อเช็คว่า Refresh Token หมดอายุหรือยัง (และเป็นของแท้ไหม)
        let payload;
        try {
          payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ error: 'Refresh token expired or invalid' });
          } 

        // 3. 🛡️ เช็คความปลอดภัย: ค้นหาใน Database ว่า Token นี้ยังเป็นของ User คนนี้จริงๆ ใช่ไหม
        // (ป้องกันกรณีโดนเตะออกจากระบบ หรือเราสั่งลบ Token ใน DB ไปแล้ว)
        const user = await prisma.users.findFirst({
          where: {
            userId: payload.userId,
            refreshToken: refreshToken // ต้องตรงกับที่เก็บใน DB
          }
        });

        if (!user) {
          
          return res.status(403).json({ error: 'Refresh token has been revoked or not found' });
        }

        // 4. ออก Access Token ใบใหม่ให้ (ต่ออายุไปอีก 1 ชั่วโมง)
        const newAccessToken = jwt.sign(
          { userId: user.userId, role: user.userRole },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // 5. ส่งเฉพาะ Access Token ใบใหม่กลับไป
        res.status(200).json({ accessToken: newAccessToken });

      } catch (error) {
          console.error('Refresh Token Error:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
  };
}

export default new AuthController();