import authService from '../services/authService.js';
import prismaClient from '../configs/prismaClient.js';
import jwt from 'jsonwebtoken';

class AuthController {
  /**
   * ใช้ Dependency Injection แทนการ import ตรงๆ ในตัว method
   * เพื่อให้ Controller แยกอิสระจาก Prisma/JWT/authService จริงๆ
   * (Testable: ตอน unit test สามารถส่ง mock object เข้ามาแทนได้)
   */
  constructor({
    prisma = prismaClient,
    jwtLib = jwt,
    authSvc = authService,
    jwtSecret = process.env.JWT_SECRET,
    accessTokenTTL = '1h',
  } = {}) {
    this.prisma = prisma;
    this.jwt = jwtLib;
    this.authService = authSvc;
    this.jwtSecret = jwtSecret;
    this.accessTokenTTL = accessTokenTTL;

    // Bind methods เพื่อให้ใช้เป็น express route handler ได้ตรงๆ
    // (กัน error "this is undefined" ตอน destructure ไปใช้กับ router)
    this.googleLogin = this.googleLogin.bind(this);
    this.getMe = this.getMe.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  }

  // ---------- Private helpers ----------

  #signAccessToken(user) {
    return this.jwt.sign(
      { userId: user.userId, role: user.userRole },
      this.jwtSecret,
      { expiresIn: this.accessTokenTTL }
    );
  }

  #toPublicUser(user) {
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      role: user.userRole,
      ...(user.userStatus !== undefined && { userStatus: user.userStatus }),
    };
  }

  #sendError(res, status, message) {
    return res.status(status).json({ error: message });
  }

  // ---------- Route handlers ----------

  async googleLogin(req, res) {
    try {
      const { googleToken } = req.body || {};

      if (!googleToken) {
        return this.#sendError(res, 400, 'Missing Google Token');
      }

      const result = await this.authService.verifyGoogleToken(googleToken);

      res.status(200).json({
        status: 'success',
        message: 'Login Successful',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: this.#toPublicUser(result.user),
        },
      });
    } catch (error) {
      console.error('Google OAuth Error:', error);
      this.#sendError(res, 401, 'Invalid or Expired Google Token');
    }
  }

  async getMe(req, res) {
    try {
      const userId = req.user.userId;

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          email: true,
          displayName: true,
          profilePicture: true,
          userRole: true,
        },
      });

      if (!user) {
        return this.#sendError(res, 404, 'User not found');
      }

      res.status(200).json({ data: { user: this.#toPublicUser(user) } });
    } catch (error) {
      console.error('Get Me Error:', error);
      this.#sendError(res, 500, 'Internal server error');
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user.userId;

      if (!userId) {
        return this.#sendError(res, 400, 'No refresh token provided');
      }

      await this.prisma.user.update({
        where: { 
          userId: userId 
        },
        data: { 
          refreshToken: null 
        },
      });

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout Error:', error);
      this.#sendError(res, 500, 'Internal server error during logout');
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return this.#sendError(res, 401, 'No refresh token provided');
      }

      let payload;
      try {
        payload = this.jwt.verify(refreshToken, this.jwtSecret);
      } catch (err) {
        return this.#sendError(res, 403, 'Refresh token expired or invalid');
      }

      // เช็คว่า token นี้ยังตรงกับที่เก็บใน DB จริงไหม (ป้องกัน token ที่ถูก revoke แล้ว)
      const user = await this.prisma.user.findFirst({
        where: {
          userId: payload.userId,
          refreshToken,
        },
      });

      if (!user) {
        return this.#sendError(res, 403, 'Refresh token has been revoked or not found');
      }

      const newAccessToken = this.#signAccessToken(user);

      res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      console.error('Refresh Token Error:', error);
      this.#sendError(res, 500, 'Internal server error');
    }
  }
}

// Export ทั้ง class (สำหรับ test / DI) และ instance สำเร็จรูป (สำหรับใช้ใน route ปกติ)
export default new AuthController();