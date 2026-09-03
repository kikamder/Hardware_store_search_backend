import prismaInstance from '../configs/prismaClient.js';

class FavoriteService {
  constructor({ prisma = prismaInstance } = {}) {
    this.prisma = prisma;
  }

  #formatDate(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

 
  async shopProductExists(shopProductId) {
    const product = await this.prisma.shop_products.findUnique({
      where: { shopProductId },
      select: { shopProductId: true },
    });
    return product !== null;
  }

  async shopExists(shopId) {
    const shop = await this.prisma.shops.findUnique({
      where: { shopId },
      select: { shopId: true },
    });
    return shop !== null;
  }


 async addFavorite(customerId, shopProductId) {
    const existing = await this.prisma.favorite_products.findUnique({
      where: { customerId_shopProductId: { customerId, shopProductId } },
    });

    // เคยกดถูกใจไปแล้ว - ไม่ต้อง increment ซ้ำ แค่ return ของเดิม
    if (existing) {
      return {
        customerId: existing.customerId,
        shopProductId: existing.shopProductId,
        createdAt: existing.add_date,
      };
    }

    
    const shopProduct = await this.prisma.shop_products.findUnique({
      where: { shopProductId },
      select: { masterId: true },
    });

    // create favorite + increment savedCount ต้องเป็น atomic ไปด้วยกัน
    // ถ้าอันใดอันหนึ่งล้ม อีกอันต้อง rollback ด้วย ไม่งั้นข้อมูลจะไม่ตรงกัน
    const [favorite] = await this.prisma.$transaction([
      this.prisma.favorite_products.create({ data: { customerId, shopProductId } }),
      this.prisma.master_hardware.update({
        where: { masterId: shopProduct.masterId },
        data: { savedCount: { increment: 1 } },
      }),
    ]);

    return {
      customerId: favorite.customerId,
      shopProductId: favorite.shopProductId,
      createdAt: favorite.add_date,
    };
  }

  async addFavoriteShop(customerId, shopId) {
    const favorite = await this.prisma.favorite_shops.upsert({
      where: {
        customerId_shopId: { customerId, shopId },
      },
      update: {},
      create: { customerId, shopId },
      select : {
        shops : {
          select : {
            
            shopName : true,
            profileImageUrl : true,
            province : true,
            district :true
          }
        }
      }
    });
 
    return {
      shopId: shopId,
      shopName: favorite.shops.shopName,
      profileImageUrl: favorite.shops.profileImageUrl,
      province: favorite.shops.province,
      district: favorite.shops.district,
    };
  }

  async getFavoriteShops(customerId, { page, limit }) {
    const where = { customerId };
    const skip = (page - 1) * limit;
 
    const [favorites, totalItems] = await Promise.all([
      this.prisma.favorite_shops.findMany({
        where,
        skip,
        take: limit,
        select: {
          add_date: true,
          shopId: true,
          shops: {
            select: {
              shopName: true,
              profileImageUrl: true,
              province: true,
              district: true,
            },
          },
        },
        orderBy: { add_date: 'desc' },
      }),
      this.prisma.favorite_shops.count({ where }),
    ]);
 
    const shops = favorites.map((fav) => ({
      shopId: fav.shopId,
      shopName: fav.shops.shopName,
      profileImageUrl: fav.shops.profileImageUrl,
      province: fav.shops.province,
      district: fav.shops.district,
      addDate: this.#formatDate(fav.add_date),
    }));
 
    return { shops, totalItems };
  }
  
  async removeFavorite(customerId, shopProductId) {
    await this.prisma.favorite_products.deleteMany({
      where: { customerId, shopProductId },
    });
  }

  async removeFavoriteShop(customerId, shopId) {
    await this.prisma.favorite_shops.deleteMany({
      where: { customerId, shopId },
    });
  }

  async getFavorites(customerId, { page, limit, category }) {
    const where = {
      customerId,
      ...(category && { shop_products: { master_hardware: { category } } }),
    };
 
    const skip = (page - 1) * limit;
 
    const [favorites, totalItems] = await Promise.all([
      this.prisma.favorite_products.findMany({
        where,
        skip,
        take: limit,
        select: {
        add_date: true,
        shop_products: {
          select: {
            shopProductId: true,
            price: true,
            shopId: true,
            
            master_hardware: {
              select: { displayName: true, category: true },
            },
            shops: {
              select: {
                profileImageUrl: true,
                shopName: true,
                province: true,
                district: true,
              },
            },
          },
        },
      },
      orderBy: { add_date: 'desc' },
    }),
      this.prisma.favorite_products.count({ where }),
    ]);
 
    const products = favorites.map((fav) => ({
      shopProductId: fav.shop_products.shopProductId,
      displayName: fav.shop_products.master_hardware.displayName,
      price: Number(fav.shop_products.price),
      category: fav.shop_products.master_hardware.category,
      shopId: fav.shop_products.shopId,
      addDate: this.#formatDate(fav.add_date),
      profileImageUrl: fav.shop_products.shops.profileImageUrl,
      shopName: fav.shop_products.shops.shopName,
      province: fav.shop_products.shops.province,
      district: fav.shop_products.shops.district,
      addDate: this.#formatDate(fav.add_date),
    }));
 
    return { products, totalItems };
  }
}

export { FavoriteService };
export default new FavoriteService();