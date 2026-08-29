import prismaInstance from '../configs/prismaClient.js';

class FavoriteService {
  constructor({ prisma = prismaInstance } = {}) {
    this.prisma = prisma;
  }

  /**
   * เช็คว่า shopProductId นี้มีอยู่จริงในระบบไหม ก่อนจะบันทึกลง favorite
   */
  async shopProductExists(shopProductId) {
    const product = await this.prisma.shop_products.findUnique({
      where: { shopProductId },
      select: { shopProductId: true },
    });
    return product !== null;
  }

  /**
   * เพิ่มสินค้าลง favorite แบบ idempotent:
   * กดซ้ำแล้วไม่ error (ไม่ชน unique constraint) แค่ return ของเดิมที่มีอยู่แล้ว
   */
  async addFavorite(customerId, shopProductId) {
    const favorite = await this.prisma.favorite_products.upsert({
      where: {
        // ⚠️ ชื่อ compound key นี้เป็นค่า default ที่ Prisma generate ให้
        // ถ้า schema จริงตั้งชื่อ @@id(..., name: "...") เอง ต้องแก้ตรงนี้ให้ตรง
        customerId_shopProductId: { customerId, shopProductId },
      },
      update: {}, // มีอยู่แล้ว ไม่ต้องอัปเดตอะไร แค่ return ของเดิม
      create: { customerId, shopProductId },
    });

    // แปลง add_date (ชื่อ column จริงใน DB) ให้เป็น createdAt ตามที่สเปก response ต้องการ
    return {
      customerId: favorite.customerId,
      shopProductId: favorite.shopProductId,
      createdAt: favorite.add_date,
    };
  }
}

export { FavoriteService };
export default new FavoriteService();