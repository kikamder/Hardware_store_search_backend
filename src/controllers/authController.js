const authService = require('../services/authService');

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
        accessToken: result.accessToken,  
        refreshToken: result.refreshToken, 
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Google OAuth Error:', error);
      res.status(401).json({ error: 'Invalid or Expired Google Token' });
    }
  }
}

module.exports = new AuthController();