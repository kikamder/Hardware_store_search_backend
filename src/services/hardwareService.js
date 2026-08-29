import prismaClient from '../configs/prismaClient.js';

class HardwareService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
  }

  /**
   * ค้นหา hardware ตาม category + keyword แบบ autocomplete
   * เอาแค่ field ที่จำเป็น (masterId, displayName) เพราะ dropdown ไม่ต้องใช้ข้อมูลเยอะ
   * ยิ่ง select น้อย ยิ่งเร็ว เหมาะกับ endpoint ที่ต้อง real-time ตามที่พิมพ์
   */
  async autocomplete(category, keyword) {
    return this.prisma.master_hardware.findMany({
      where: {
        category,
        displayName: {
          contains: keyword,
          mode: 'insensitive', // ไม่สนตัวพิมพ์เล็ก-ใหญ่ เช่น "rtx" ก็เจอ "RTX"
        },
      },
      select: {
        masterId: true,
        displayName: true,
      },
      orderBy: {
        searchCount: 'desc', // ของที่คนค้นบ่อยกว่า ขึ้นก่อน
      },
      take: 10,
    });
  }
}

export { HardwareService };
export default new HardwareService();