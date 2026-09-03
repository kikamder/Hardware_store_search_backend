import prismaClient from '../configs/prismaClient.js';
import { UserRole, UserStatus } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_USER_STATUSES = Object.values(UserStatus); 
const VALID_USER_ROLES = Object.values(UserRole); 
const ALLOWED_UPDATE_FIELDS = ['userRole', 'userStatus'];

class UserService {

  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
  }

  #normalizePagination(page, limit) {
    const pageNumber = Math.max(1, Math.trunc(Number(page)) || DEFAULT_PAGE);
    const limitNumber = Math.min(
     MAX_LIMIT,
     Math.max(1, Math.trunc(Number(limit)) || DEFAULT_LIMIT),
    );
 
    return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
  }

  #filterAllowedFields(body = {}) {
        return ALLOWED_UPDATE_FIELDS.reduce((acc, field) => {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
            acc[field] = body[field];
            }
            return acc;
        }, {});
  }

  async getUsers({ page, search, role, status, limit } = {}) {
    const { pageNumber, limitNumber } = this.#normalizePagination(page, limit);

    const where = {
      ...(role && { userRole: role }),
      ...(status && { userStatus: status }),
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          userId: true,
          email: true,
          displayName: true,
          userRole: true,
          userStatus: true,
        },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      meta: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNumber) || 0,
      },
    };
  }
    async updateUser(targetUserId, body) {
        const updateData = this.#filterAllowedFields(body);

        if (Object.keys(updateData).length === 0) {
            const error = new Error('ไม่มีข้อมูลสำหรับอัปเดต');
            error.statusCode = 400;
            throw error;
        }

        if ('userStatus' in updateData && !VALID_USER_STATUSES.includes(updateData.userStatus)) {
            const error = new Error('สถานะที่ระบุไม่ถูกต้อง ต้องเป็น ACTIVE หรือ SUSPENDED เท่านั้น');
            error.statusCode = 400;
            throw error;
        }

        if ('userRole' in updateData && !VALID_USER_ROLES.includes(updateData.userRole)) {
            const error = new Error('สิทธิ์การใช้งานที่ระบุไม่ถูกต้อง ต้องเป็น CUSTOMER, SHOP หรือ ADMIN เท่านั้น');
            error.statusCode = 400;
            throw error;
        }

        if (updateData.userRole === 'ADMIN' && 'userStatus' in updateData) {
            const error = new Error(
            'ไม่สามารถเลื่อนขั้นเป็นผู้ดูแลระบบพร้อมกับเปลี่ยนสถานะบัญชีในคำขอเดียวกันได้ กรุณาทำทีละรายการ',
            );
            error.statusCode = 400;
            throw error;
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { userId: Number(targetUserId) },
            select: { userId: true, email: true, userRole: true, userStatus: true },
        });

        if (!targetUser) {
            const error = new Error('ไม่พบผู้ใช้งานนี้ในระบบ');
            error.statusCode = 404;
            throw error;
        }

        if (targetUser.userRole === 'ADMIN') {
            const error = new Error('ไม่สามารถเปลี่ยนสถานะหรือสิทธิ์ของบัญชีผู้ดูแลระบบได้');
            error.statusCode = 403;
            throw error;
        }

        const updated = await this.prisma.user.update({
            where: { userId: targetUser.userId },
            data: updateData,
            select: { userId: true, email: true, userRole: true, userStatus: true },
        });

        return updated;
    }
}
export  {UserService};
export default new UserService();