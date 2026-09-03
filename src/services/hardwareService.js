import prismaClient from '../configs/prismaClient.js';

class HardwareService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
  }

 
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
        searchCount: 'desc', 
      },
      take: 10,
    });
  }
}

export { HardwareService };
export default new HardwareService();