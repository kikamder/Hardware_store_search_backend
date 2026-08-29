import prismaClient from '../configs/prismaClient.js';

class SummaryService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
  }

  async generateSummary(shopProductIds) {
    const products = await this.prisma.shop_products.findMany({
      where: {
        shopProductId: {
          in: shopProductIds,
        },
      },
      include: {
        shops: true,
        master_hardware: true,
      },
    });

    let totalPrice = 0;

    const items = products.map((product) => {
      const price = Number(product.price) || 0;
      totalPrice += price;

      return {
        shopProductId: product.shopProductId,
        category: product.master_hardware?.category || "Unknown",
        displayName: product.customTitle, 
        price: price,
        shop: {
            shopId: product.shops?.shopId,
            shopName: product.shops?.shopName,
            addressText: product.shops?.addressText, 
            subDistrict: product.shops?.subDistrict,
            district: product.shops?.district,
            province: product.shops?.province,
            zipCode: product.shops?.zipCode
        },
      };
    });

    return {
      summary: {
        totalItems: items.length,
        totalPrice: totalPrice,
      },
      items: items,
    };
  }
}

export  {SummaryService};
export default new SummaryService();