
import UserService from '../services/userService.js';

class UsersController {
  constructor({
    userService = UserService,
  } = {}) {

    this.userService = userService;
    this.getUsers = this.getUsers.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.getLocation = this.getLocation.bind(this);
    this.updateLocation = this.updateLocation.bind(this);
  }
    async getUsers(req, res, next) {
        try {
            const { page, limit, search, role, status } = req.query;

            const { users, meta } = await this.userService.getUsers({
                page,
                limit,
                search,
                role,
                status,
            });

            return res.status(200).json({
                status: 'success',
                message: 'ดึงข้อมูลรายชื่อผู้ใช้งานเรียบร้อยแล้ว',
                data: users,
                meta,
            });
            } catch (error) {
            return res.status(error.statusCode || 500).json({
                    status: 'error',
                    message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน โปรดลองใหม่อีกครั้ง',
            });
        }
    }

    async updateUser(req, res, next) {
        try {
            const { userId } = req.params;

            const data = await this.userService.updateUser(userId, req.body);

            return res.status(200).json({
            status: 'success',
            message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
            data,
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message,
            });
        }
    }

    async getLocation(req, res) {
        try {
            const userId = req.user.userId; 

            const data = await this.userService.getUserLocation(userId);

            return res.status(200).json({
            status: 'success',
            data,
            });
        } catch (error) {
            if (!error.statusCode) console.error('Get Location Error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
            status: 'error',
            message: error.statusCode ? error.message : 'เกิดข้อผิดพลาดในระบบ',
            });
        }
    }

    async updateLocation(req, res) {
        try {
            const userId = req.user.userId; 

            const data = await this.userService.updateUserLocation(userId, req.body);
            return res.status(200).json({
            status: 'success',
            message: 'อัปเดตตำแหน่งเรียบร้อยแล้ว',
            data,
            });
        } catch (error) {
            if (!error.statusCode) console.error('Update Location Error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
            status: 'error',
            message: error.statusCode ? error.message : 'เกิดข้อผิดพลาดในระบบ',
            });
        }
    }
}

export { UsersController };
export default new UsersController();