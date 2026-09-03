import prismaInstance from '../configs/prismaClient.js';

// รัศมีโลกเป็นกิโลเมตร - ใช้คำนวณระยะทางแบบ Haversine
const EARTH_RADIUS_KM = 6371;

// enum ของ productStatus - ปรับให้ตรงกับที่ประกาศจริงใน schema.prisma
const PRODUCT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  NOT_ACTIVE: 'NOT_ACTIVE',
});

const HARDWARE_LIST_REQUIRED_ITEM_FIELDS = ['category', 'masterId']; 

class MatchStoreService {
  constructor({ prisma = prismaInstance } = {}) {
    this.prisma = prisma;
  }

  // ---------- Private helpers: validation ----------

  
  //เช็คว่า hardwareList เป็น array ที่มีของอย่างน้อย 1 ชิ้น และแต่ละชิ้นมี field ครบ
  #validateHardwareList(hardwareList) {
    if (!Array.isArray(hardwareList) || hardwareList.length === 0) {
      const error = new Error('ต้องระบุ hardwareList อย่างน้อย 1 ชิ้น');
      error.statusCode = 400;
      error.details = 'hardwareList ต้องเป็น array และห้ามว่าง';
      throw error;
    }

    const invalidItems = hardwareList
      .map((item, index) => ({ index, item }))
      .filter(({ item }) =>
        HARDWARE_LIST_REQUIRED_ITEM_FIELDS.some(
          (field) => item?.[field] === undefined || item?.[field] === null || item?.[field] === '',
        ),
      );

    if (invalidItems.length > 0) {
      const error = new Error('hardwareList มีรายการที่ข้อมูลไม่ครบ');
      error.statusCode = 400;
      error.details = invalidItems.map(
        ({ index }) => `hardwareList[${index}] ต้องมี category และ masterId`,
      );
      throw error;
    }
  }

  
  //เช็ค userLocation (ไม่บังคับ แต่ถ้าส่งมาต้องมี latitude/longitude เป็นตัวเลขที่ถูกต้อง)
  #validateUserLocation(userLocation) {
    if (userLocation === undefined || userLocation === null) {
      return;
    }

    const { latitude, longitude } = userLocation;
    const isValidLat = typeof latitude === 'number' && latitude >= -90 && latitude <= 90;
    const isValidLng = typeof longitude === 'number' && longitude >= -180 && longitude <= 180;

    if (!isValidLat || !isValidLng) {
      const error = new Error('userLocation ไม่ถูกต้อง');
      error.statusCode = 400;
      error.details = 'latitude ต้องอยู่ระหว่าง -90 ถึง 90 และ longitude ต้องอยู่ระหว่าง -180 ถึง 180';
      throw error;
    }
  }

  // ---------- Private helpers: คำนวณ / จัดรูปแบบข้อมูล ----------

  
  //คำนวณระยะทางระหว่าง 2 พิกัด (กม.) ด้วยสูตร Haversine
  #calculateDistanceKm(pointA, pointB) {
    const toRadians = (deg) => (deg * Math.PI) / 180;

    const dLat = toRadians(pointB.latitude - pointA.latitude);
    const dLng = toRadians(pointB.longitude - pointA.longitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(pointA.latitude)) *
        Math.cos(toRadians(pointB.latitude)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS_KM * c * 10) / 10; 
  }

  
  //ดึง shop_products ทั้งหมดที่ตรงกับ masterId ที่ร้องขอ และเป็นสถานะ ACTIVE เท่านั้น
  //พร้อม join ข้อมูลร้านค้ามาด้วย
  async #findActiveShopProducts(masterIds) {
    return this.prisma.shop_products.findMany({
      where: {
        masterId: { in: masterIds },
        productStatus: PRODUCT_STATUS.ACTIVE,
      },
      include: {
        shops: true, // ปรับชื่อ relation ให้ตรงกับ schema.prisma จริง (shop_products -> shops)
      },
    });
  }

  
  //จัดกลุ่ม shop_products ที่ query มาได้ ตาม shopId
  //คืนค่าเป็น Map<shopId, { shop, productsByMasterId: Map<masterId, shopProduct> }>
  #groupShopProductsByShop(shopProducts) {
    const shopMap = new Map();

    for (const shopProduct of shopProducts) {
      if (!shopMap.has(shopProduct.shopId)) {
        shopMap.set(shopProduct.shopId, {
          shop: shopProduct.shops,
          productsByMasterId: new Map(),
        });
      }
      shopMap.get(shopProduct.shopId).productsByMasterId.set(shopProduct.masterId, shopProduct);
    }

    return shopMap;
  }

  
   // สร้างรายละเอียดการจับคู่ (details) ของร้านค้าหนึ่งร้าน เทียบกับ hardwareList ที่ผู้ใช้เลือกมา
   // เอาเฉพาะชิ้นที่ร้านนี้มีขายจริง (ACTIVE) เท่านั้น - ชิ้นที่ไม่มีจะไม่ถูกใส่เข้ามาใน details เลย
   // คืนค่า { details, hardwareMatchCount, totalPrice }
  #buildShopMatchDetails(hardwareList, productsByMasterId) {
    let totalPrice = 0;
    const details = [];
    const seenIds = new Set();
    for (const { category, masterId } of hardwareList) {

      // 1. ทำให้ hardwareId กลายเป็น Array เสมอ (ไม่ว่าจะส่งมาเป็น 1 หรือ [1, 14])
      const idsToSearch = Array.isArray(masterId) ? masterId : [masterId];

      // 2. วนลูปค้นหาทีละ ID จากที่รับมา
      for (const id of idsToSearch) {
        const numericId = Number(id);
        if (seenIds.has(numericId)) {
          continue; // เจอ id นี้ไปแล้วก่อนหน้า ข้ามไปเลย กันนับซ้ำ
        } 
        seenIds.add(numericId);
        // ใช้ Number(id) เพื่อความชัวร์ว่า Type ตรงกับ Key ใน Map 
        const shopProduct = productsByMasterId.get(Number(id));

        if (!shopProduct) {
          continue; // ชิ้นนี้ไม่มี ให้ข้ามไปหาชิ้นอื่นใน idsToSearch
        }

        totalPrice += Number(shopProduct.price);

        details.push({
          category,
          masterId: Number(id), // เปลี่ยนมาใช้ id เดี่ยวๆ แทน
           productStatus: PRODUCT_STATUS.ACTIVE,
          shopProductId: shopProduct.shopProductId,
          price: Number(shopProduct.price),
        });
      }
    }

    return { details, hardwareMatchCount: details.length, totalPrice };
  }

  
  //ประกอบข้อมูลร้านค้าหนึ่งร้านให้เป็นรูปแบบ response สุดท้าย
  #formatShopResult(shopId, shop, details, hardwareMatchCount, totalPrice, userLocation) {
    const hasShopCoordinates = shop?.latitude != null && shop?.longitude != null;
    const distanceKm =
      userLocation && hasShopCoordinates
        ? this.#calculateDistanceKm(userLocation, {
            latitude: Number(shop.latitude),
            longitude: Number(shop.longitude),
          })
        : null;

    return {
      shopId,
      shopName: shop?.shopName ?? null,
      shopImageUrl: shop?.profileImageUrl ?? null,
      province: shop?.province ?? null,
      district: shop?.district ?? null,
      distanceKm,
      shopLatitude: shop?.latitude ?? null,
      shopLongitude: shop?.longitude ?? null,
      hardwareMatchCount,
      totalPrice,
      details,
    };
  }

  
  //เรียงลำดับร้านค้า: จำนวนชิ้นที่ตรงมากสุดก่อน ถ้าเท่ากันให้ร้านที่ใกล้กว่ามาก่อน
  #sortShopResults(results) {
    return results.sort((a, b) => {
      if (b.hardwareMatchCount !== a.hardwareMatchCount) {
        return b.hardwareMatchCount - a.hardwareMatchCount;
      }
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });
  }

  // ---------- Public API ----------

  
  //ค้นหาและจับคู่ร้านค้าที่มีสินค้าตรงกับ hardwareList ที่ผู้ใช้เลือกไว้
  async matchStoresByHardwareList({ hardwareList, userLocation } = {}) {
    this.#validateHardwareList(hardwareList);
    this.#validateUserLocation(userLocation);

    const masterIds = hardwareList.flatMap(item => item.masterId);

    const shopProducts = await this.#findActiveShopProducts(masterIds);
    const shopMap = this.#groupShopProductsByShop(shopProducts);

    const results = [];

    for (const [shopId, { shop, productsByMasterId }] of shopMap) {
      const { details, hardwareMatchCount, totalPrice } = this.#buildShopMatchDetails(
        hardwareList,
        productsByMasterId,
      );

      // เอาเฉพาะร้านที่มีของตรงอย่างน้อย 1 ชิ้น (ตามสเปก "รายชื่อร้านค้าที่ผ่านการจับคู่")
      if (hardwareMatchCount === 0) {
        continue;
      }

      results.push(
        this.#formatShopResult(shopId, shop, details, hardwareMatchCount, totalPrice, userLocation),
      );
    }
    const uniqueMasterIds = [...new Set(masterIds)];
    await this.prisma.master_hardware.updateMany({
      where: { masterId: { in: uniqueMasterIds } },
      data: { searchCount: { increment: 1 } },
    });
    
    return this.#sortShopResults(results);
  }
}

export { MatchStoreService, PRODUCT_STATUS };
export default new MatchStoreService();