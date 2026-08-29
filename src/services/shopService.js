import prismaClient from '../configs/prismaClient.js';

class ShopService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
  }

  // ---------- Private helpers ----------

  /**
   * รวม field จาก req.body (string ล้วน เพราะมาจาก multipart/form-data)
   * ให้เป็น object พร้อมแปลง type ที่จำเป็น (lat/long ต้องเป็น Number)
   *
   * อิงตาม schema จริง: field เจ้าของร้านคือ userId (ไม่ใช่ ownerId),
   * field รูปภาพไม่มีคำว่า Url ต่อท้าย (idCardImage/businessRegImage/storeImnage)
   */
  #buildShopData(userId, body, imageFiles) {
    return {
      userId,
      ownerFirstName: body.ownerFirstName,
      ownerLastName: body.ownerLastName,
      shopName: body.shopName,
      shopDescription: body.shopDescription ?? null, // มีใน DB แต่ไม่ได้อยู่ใน spec เอกสารเดิม
      addressText: body.addressText,
      subDistrict: body.subDistrict,
      district: body.district,
      province: body.province,
      zipCode: body.zipCode,
      // ⚠️ คอลัมน์เป็น jsonb แต่ค่าที่ส่งมาเป็น string ธรรมดา
      // เก็บเป็น JSON scalar (string) ไปตรงๆ ก่อน - ดูหมายเหตุท้ายไฟล์ว่าควรปรับโครงสร้างไหม
      contactChannels: body.contactChannels,
      ownerPhone: body.ownerPhone,
      // FormData ส่งมาเป็น string เสมอ ต้องแปลงเป็นตัวเลขก่อนบันทึก
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      operatingHours: body.operatingHours,
      profileImageUrl: imageFiles.profileImageUrl ?? null,
      idCardImage: imageFiles.idCardImage,
      businessRegImage: imageFiles.businessRegImage ?? null,
      storeImnage: imageFiles.storeImnage,
      // ร้านใหม่ต้องรอแอดมินอนุมัติก่อนเสมอ ตามสเปก
      shopStatus: 'PENDING',
      submittedAt: new Date(),
    };
  }

  #buildFullAddress(shop) {
    const parts = [shop.addressText, shop.subDistrict, shop.district, shop.province, shop.zipCode];
    return parts.filter(Boolean).join(' ');
  }

  #buildContact(contactChannels) {
    return {
      phone: contactChannels?.phone ?? null,
      lineId: contactChannels?.lineId ?? null,
      facebook: contactChannels?.facebook ?? null,
    };
  }
 
  /**
   * แปลง record จาก DB ให้เป็นรูปแบบ response ตามสเปก getShopProfile
   */
  #toProfileResponse(shop) {
    return {
      shopId: shop.shopId,
      shopName: shop.shopName,
      description: shop.shopDescription,
      profileImageUrl: shop.profileImageUrl,
      fullAddress: this.#buildFullAddress(shop),
      // Prisma คืน Decimal เป็น object พิเศษ ต้องแปลงเป็น Number ก่อนส่งเป็น JSON
      // ไม่งั้นจะได้ค่าประหลาดหรือ error ตอน serialize
      latitude: shop.latitude !== null ? Number(shop.latitude) : null,
      longitude: shop.longitude !== null ? Number(shop.longitude) : null,
      contact: this.#buildContact(shop.contactChannels),
      operatingHours: shop.operatingHours,
    };
  }

  // ---------- Public API ----------

  /**
   * สมัครเปิดร้านค้าใหม่
   * @param {number} userId - userId จาก JWT (ผูกเป็นเจ้าของร้านอัตโนมัติ)
   * @param {object} body - ข้อมูลร้านค้าจาก req.body
   * @param {object} imageFiles - path ของรูปที่อัปโหลดแล้ว (มาจาก multer)
   */
  async findShopByUserId(userId) {
    return this.prisma.shops.findUnique({ where: { userId } });
  }
  
  async registerShop(userId, body, imageFiles) {
    const data = this.#buildShopData(userId, body, imageFiles);

    const shop = await this.prisma.shops.create({
      data,
      select: {
        shopId: true,
        shopStatus: true,
      },
    });

    return shop;
  }

  async getShopProfile(shopId) {
    const shop = await this.prisma.shops.findUnique({
      where: { shopId },
      select: {
        shopId: true,
        shopName: true,
        shopDescription: true,
        profileImageUrl: true,
        addressText: true,
        subDistrict: true,
        district: true,
        province: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        contactChannels: true,
        operatingHours: true,
      },
    });
 
    if (!shop) return null;
 
    return this.#toProfileResponse(shop);
  }


  async getShopProducts(shopId, { page, limit, category }) {
    const shopExists = await this.prisma.shops.findUnique({
      where: { shopId },
      select: { shopId: true },
    });
    if (!shopExists) return null;
 
    const where = {
      shopId,
      // ใส่เงื่อนไข category ก็ต่อเมื่อมีการกรองจริง ไม่งั้นจะ join แบบไม่จำเป็น
      ...(category && { master_hardware: { category } }),
    };
 
    const skip = (page - 1) * limit;
 
    const [products, totalItems] = await Promise.all([
      this.prisma.shop_products.findMany({
        where,
        skip,
        take: limit,
        select: {
          shopProductId: true,
          customTitle: true,
          price: true,
          warranty: true,
          description: true,
          imageUrl: true,
          productStatus: true,
          master_hardware: {
            select: {
              category: true, // 2. Join ไปที่ตาราง master_hardware เพื่อดึงแค่ category
            },
         },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop_products.count({ where }),
    ]);
 
    return {
      // price เป็น Decimal ใน Prisma ต้องแปลงเป็น Number ก่อนส่งเป็น JSON เหมือน lat/long
      products: products.map((p) => {
        const { master_hardware, ...rest } = p; 
    
        return {
          ...rest, 
          price: Number(p.price),
          category: master_hardware?.category,
       };
      }),
    totalItems,
    }
  }
}

export { ShopService };
export default new ShopService();