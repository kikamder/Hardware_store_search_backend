import prismaClient from '../configs/prismaClient.js';

const CATEGORY_RELATION_MAP = {
  CPU: 'cpus',
  MAINBOARD: 'mainboards',
  VGA: 'vgas',
  RAM: 'rams',
  STORAGE: 'storages',
  PSU: 'psus',
};


class HardwareService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
  }

 
  async autocomplete(category, keyword) {
    const relationName = CATEGORY_RELATION_MAP[category];

    const results = await this.prisma.master_hardware.findMany({
      where: {
        category,
        displayName: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
      select: {
        masterId: true,
        displayName: true,
        brand: true,
        ...(relationName && { [relationName]: true }),
      },
      orderBy: {
        searchCount: 'desc',
      },
      take: 10,
    });

    return results;
  }

   async getHardwareDetail(masterId) {
      const hardware = await this.prisma.master_hardware.findUnique({
        where: { masterId: Number(masterId) },
      });

      if (!hardware) {
        const error = new Error('ไม่พบข้อมูลฮาร์ดแวร์นี้ในระบบ');
        error.statusCode = 404;
        throw error;
      }

      const relationName = CATEGORY_RELATION_MAP[hardware.category];

      const rawDetail = relationName
        ? await this.prisma[relationName].findUnique({
            where: { masterId: hardware.masterId },
          })
        : null;

      // ตัด masterId ออกจาก subtype object ก่อน return เพราะซ้ำกับ masterId อันนอกอยู่แล้ว
      const { masterId: _omit, ...detail } = rawDetail ?? {};

      return {
        masterId: hardware.masterId,
        displayName: hardware.displayName,
        brand: hardware.brand,
        category: hardware.category,
        ...(relationName && { [relationName]: detail }),
      };
    }
}

export { HardwareService };
export default new HardwareService();