import prismaClient from '../configs/prismaClient.js';
import productServiceInstance from './productService.js';
import { ShopStatus } from '@prisma/client';
const SHOP_FIELD_CONFIG = Object.freeze({
  ownerFirstName:   { type: 'string' },
  ownerLastName:    { type: 'string' },
  shopName:         { type: 'string' },
  shopDescription:  { type: 'string' },
  addressText:      { type: 'string' },
  subDistrict:      { type: 'string' },
  district:         { type: 'string' },
  province:         { type: 'string' },
  zipCode:          { type: 'string' },
  contactChannels:  { type: 'object' },
  ownerPhone:       { type: 'string' },
  latitude:         { type: 'number' },
  longitude:        { type: 'number' },
  operatingHours:   { type: 'string' },
  profileImageUrl:  { type: 'string' },
});

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_SHOP_STATUSES = Object.values(ShopStatus);

class ShopService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
    this.productService = productServiceInstance;
  }
  
  // ---------- Private helpers ----------

  
  //รวม field จาก req.body (string ล้วน เพราะมาจาก multipart/form-data)
  //ให้เป็น object พร้อมแปลง type ที่จำเป็น (lat/long ต้องเป็น Number)
  #buildShopData(userId, body, imageFiles) {
    return {
      userId,
      ownerFirstName: body.ownerFirstName,
      ownerLastName: body.ownerLastName,
      shopName: body.shopName,
      shopDescription: body.shopDescription ?? null, 
      addressText: body.addressText,
      subDistrict: body.subDistrict,
      district: body.district,
      province: body.province,
      zipCode: body.zipCode,
      contactChannels: body.contactChannels,
      ownerPhone: body.ownerPhone,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      operatingHours: body.operatingHours,
      profileImageUrl: imageFiles.profileImageUrl ?? null,
      idCardImage: imageFiles.idCardImage,
      businessRegImage: imageFiles.businessRegImage ?? null,
      storeImnage: imageFiles.storeImnage,
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
      line: contactChannels?.line ?? null,
      website: contactChannels?.website ?? null,
      facebook: contactChannels?.facebook ?? null,
    };
  }
 
  
  //แปลง record จาก DB ให้เป็นรูปแบบ response ตามสเปก getShopProfile
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
      ownerPhone: shop.ownerPhone,
      operatingHours: shop.operatingHours,
    };
  }

   async #findMissingSavedItems(ownMasterIds, limit = 10) {
    const items = await this.prisma.master_hardware.findMany({
      where: {
        masterId: { notIn: ownMasterIds },
        savedCount: { gt: 0 }, // เอาเฉพาะที่มีคนกดถูกใจจริงๆ ไม่เอาของที่ยังไม่มีใครกด (savedCount = 0)
      },
      select: { masterId: true, displayName: true, savedCount: true },
      orderBy: { savedCount: 'desc' },
      take: limit,
    });
 
    return items.map((item) => ({
      masterId: item.masterId,
      hardwareName: item.displayName,
      savedCount: item.savedCount,
    }));
  }

  #buildMostInterestedHardware(shopProductsWithHardware) {
    const result = {};
 
    for (const { master_hardware } of shopProductsWithHardware) {
      const current = result[master_hardware.category];
      if (!current || master_hardware.searchCount > current.searchCount) {
        result[master_hardware.category] = {
          hardwareName: master_hardware.displayName,
          searchCount: master_hardware.searchCount,
        };
      }
    }
 
    return result;
  }

  #buildUpdatePayload(payload) {
    const dataToUpdate = {};

    for (const [field, config] of Object.entries(SHOP_FIELD_CONFIG)) {
      if (payload[field] === undefined) continue;

      const value = payload[field];

      if (config.type === 'number') {
        dataToUpdate[field] = Number(value);
      } else if (config.type === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          const err = new Error(`${field} ต้องเป็น object เท่านั้น`);
          err.statusCode = 400;
          throw err;
        }
        dataToUpdate[field] = value;
      } else {
        dataToUpdate[field] = value;
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      const err = new Error('ไม่มีข้อมูลที่ต้องการอัปเดต');
      err.statusCode = 400;
      throw err;
    }

    return dataToUpdate;
  }

  

  async #getSummary() {
    const grouped = await this.prisma.shops.groupBy({
      by: ['shopStatus'],
      _count: { shopStatus: true },
    });

    const counts = grouped.reduce((acc, item) => {
      acc[item.shopStatus] = item._count.shopStatus;
      return acc;
    }, {});

    const pending = counts.PENDING ?? 0;
    const approve = counts.OPEN ?? 0;
    const closed = counts.CLOSED ?? 0;
    const rejected = counts.REJECTED ?? 0;
    const suspended = counts.SUSPENDED ?? 0;

    return {
      all: pending + approve + closed + rejected + suspended,
      pending,
      approve,
      closed,
      rejected,
      suspended,
    };
  }

  #mapToResponse_GetShop(shop) {
    return {
      shopId: shop.shopId,
      shopName: shop.shopName,
      ownerName: `${shop.ownerFirstName} ${shop.ownerLastName}`,
      ownerEmail: shop.user.email,
      ownerPhone: shop.ownerPhone,
      shopStatus: shop.shopStatus,
      submittedAt: shop.submittedAt,
    };
  }

  #normalizePagination(page, limit) {
    const pageNumber = Math.max(1, Math.trunc(Number(page)) || DEFAULT_PAGE);
    const limitNumber = Math.min(
     MAX_LIMIT,
     Math.max(1, Math.trunc(Number(limit)) || DEFAULT_LIMIT),
    );
 
    return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
  }
  
  #mapToResponse_ShopDetail(shop) {
    return {
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        profileImageUrl: shop.profileImageUrl,
        operatingHours: shop.operatingHours,
        shopDescription: shop.shopDescription,
      },
      owner: {
        userId: shop.user.userId,
        email: shop.user.email,
        firstName: shop.ownerFirstName,
        lastName: shop.ownerLastName,
        phone: shop.ownerPhone,
      },
      contactChannels: shop.contactChannels,
      location: {
        addressText: shop.addressText,
        subDistrict: shop.subDistrict,
        district: shop.district,
        province: shop.province,
        zipCode: shop.zipCode,
        latitude: shop.latitude ? Number(shop.latitude) : null,
        longitude: shop.longitude ? Number(shop.longitude) : null,
      },
      status: {
        shopStatus: shop.shopStatus,
        submittedAt: shop.submittedAt,
      },
      statistics: {
        totalProducts: shop._count.shop_products,
        totalFavorites: shop._count.favorite_shops,
      },
      storeverification: {
        idCardImage: shop.idCardImage,
        businessRegImage: shop.businessRegImage,
        storeImnage: shop.storeImnage,
        approveAt: shop.approveAt,
        approveBy: shop.approveBy,
      },
    };
  }

  // ---------- Public API ----------

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
        ownerPhone: true,
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
        where : {
          productStatus: 'ACTIVE'
        },
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

  async getDashboard(userId) {
    const shop = await this.findShopByUserId(userId);
    if (!shop) return null;
 
    const { shopId } = shop;
 
    const [allGoodsInStore, likeReceivedCount, shopProductsWithHardware] = await Promise.all([
      this.prisma.shop_products.count({ where: { shopId } }),
      this.prisma.favorite_products.count({ where: { shop_products: { shopId } } }),
      this.prisma.shop_products.findMany({
        where: { shopId },
        select: {
          masterId: true,
          master_hardware: {
            select: { displayName: true, category: true, searchCount: true },
          },
        },
      }),
    ]);
    
    const ownMasterIds = shopProductsWithHardware.map((p) => p.masterId);
    
    const missingSavedItems = await this.#findMissingSavedItems(ownMasterIds);
    
    return {
      storeInfo: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        profileImageUrl: shop.profileImageUrl,
        fullAddress: this.#buildFullAddress(shop),
      },
      overview: {
        allGoodsInStore,
        likeReceivedCount,
      },
      mostInterestedHardware: this.#buildMostInterestedHardware(shopProductsWithHardware),
      missingSavedItems,
    };
  }

  async updateShopProfile(userId, payload) {
    const shop = await this.findShopByUserId(userId);
    const dataToUpdate = this.#buildUpdatePayload(payload);

    const updatedShop = await this.prisma.shops.update({
      where: { shopId: shop.shopId },
      data: dataToUpdate,
    });
    
    return updatedShop;
  }
  
  async getStores({ page, limit, search, status } = {}) {
    const { pageNumber, limitNumber } = this.#normalizePagination(page, limit);

    const where = {
      ...(status && { shopStatus: status }),
      ...(search && {
        OR: [
          { shopName: { contains: search, mode: 'insensitive' } },
          { ownerFirstName: { contains: search, mode: 'insensitive' } },
          { ownerLastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [shops, totalItems, summary] = await Promise.all([
      this.prisma.shops.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { submittedAt: 'desc' },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      this.prisma.shops.count({ where }),
      this.#getSummary(),
    ]);

    return {
      summary,
      data: shops.map((shop) => this.#mapToResponse_GetShop(shop)),
      meta: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNumber) || 0,
      },
    };
  }

  async getStoreDetail(shopId) {
    const shop = await this.prisma.shops.findUnique({
      where: { shopId: Number(shopId) },
      include: {
        user: {
          select: { userId: true, email: true },
        },
        _count: {
          select: { shop_products: true, favorite_shops: true },
        },
      },
    });

    if (!shop) {
      const error = new Error('ไม่พบร้านค้านี้ในระบบ');
      error.statusCode = 404;
      throw error;
    }

    return this.#mapToResponse_ShopDetail(shop);
  }

  async updateStoreStatus(adminUserId, shopId, shopStatus) {
  if (!shopStatus || !VALID_SHOP_STATUSES.includes(shopStatus)) {
    const error = new Error('สถานะร้านค้าที่ระบุไม่ถูกต้อง');
    error.statusCode = 400;
    throw error;
  }

  const shop = await this.prisma.shops.findUnique({
    where: { shopId: Number(shopId) },
    include: { user: true },
  });

  if (!shop) {
    const error = new Error('ไม่พบร้านค้านี้ในระบบ');
    error.statusCode = 404;
    throw error;
  }

  const isFirstApproval = shopStatus === 'OPEN' && shop.approveAt === null;

  const updated = await this.prisma.$transaction(async (tx) => {
    const updatedShop = await tx.shops.update({
      where: { shopId: shop.shopId },
      data: {
        shopStatus,
        ...(isFirstApproval && {
          approveAt: new Date(),
          approveBy: adminUserId,
        }),
      },
    });

    if (isFirstApproval && shop.user.userRole === 'CUSTOMER') {
      await tx.user.update({
        where: { userId: shop.userId },
        data: { userRole: 'SHOP' },
      });
    }

    return updatedShop;
  });

  return {
    shopId: updated.shopId,
    shopName: updated.shopName,
    shopStatus: updated.shopStatus,
  };
}

}

export { ShopService };
export default new ShopService();