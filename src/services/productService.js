import prismaClient from '../configs/prismaClient.js';

/**
 * แมประหว่าง category (ตาม enum ในตาราง master_hardware)
 * กับตารางสเปกเฉพาะทาง (cpus, rams, vgas, mainboards, storages, psus)
 *
 * - table      : ชื่อ model ฝั่ง Prisma ที่ผูกกับตารางนั้น ๆ
 *                (ปรับชื่อให้ตรงกับที่ generate จริงใน schema.prisma ของโปรเจกต์)
 * - specFields : รายชื่อฟิลด์ที่ต้องมาใน req.body.hardware เพื่อ INSERT ลงตารางเฉพาะทาง
 *                (ไม่รวม brand / hardwareKey / displayName เพราะอยู่ที่ master_hardware)
 */
const HARDWARE_CATEGORY_CONFIG = Object.freeze({
  CPU: {
    table: 'cpus',
    specFields: ['family', 'processorClass', 'socket'],
  },
  RAM: {
    table: 'rams',
    specFields: ['ramType', 'capacityGB', 'busSpeed'],
  },
  VGA: {
    table: 'vgas',
    specFields: ['series', 'chipset', 'vramSize'],
  },
  MAINBOARD: {
    table: 'mainboards',
    specFields: ['formFactor', 'socket', 'chipset', 'serie'],
  },
  STORAGE: {
    table: 'storages',
    specFields: ['storageType', 'interfaceType', 'capacityGB','model'],
  },
  PSU: {
    table: 'psus',
    specFields: ['watt', 'standard80Plus','model'],
  },
});

const ALLOWED_UPDATE_FIELDS = ['customTitle', 'price', 'warranty', 'description', 'imageUrl', 'productStatus'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ฟิลด์ระดับ master_hardware ที่บังคับต้องมี เมื่อเป็นการสร้างสเปกใหม่ (ไม่มี product_model_id)
const MASTER_HARDWARE_REQUIRED_FIELDS = ['hardware_key', 'display_name', 'brand'];

// ฟิลด์ระดับ storeDetails ที่บังคับต้องมีเสมอ ไม่ว่าจะเป็นสินค้าใหม่หรือของเดิม
const STORE_DETAILS_REQUIRED_FIELDS = ['customTitle', 'price'];

class ProductService {
  constructor({ prisma = prismaClient } = {}) {
    this.prisma = prisma;
    
  }

  // ---------- Private helpers: validation ----------

  /**
   * เช็คว่า category ที่ส่งมา รองรับในระบบหรือไม่
   * คืนค่า config ของ category นั้น (table + specFields)
   */
  #getCategoryConfigOrThrow(category) {
    const config = HARDWARE_CATEGORY_CONFIG[category];
    if (!config) {
      const supported = Object.keys(HARDWARE_CATEGORY_CONFIG).join(', ');
      const error = new Error(`ไม่รองรับ category "${category}" (รองรับเฉพาะ: ${supported})`);
      error.statusCode = 400;
      throw error;
    }
    return config;
  }

  /**
   * เช็ค field ที่บังคับต้องมี คืน array ชื่อ field ที่ขาด
   */
  #findMissingFields(source, requiredFields) {
    return requiredFields.filter(
      (field) => source?.[field] === undefined || source?.[field] === null || source?.[field] === '',
    );
  }

  /**
   * เช็คความครบถ้วนของ storeDetails (บังคับทุกกรณี)
   */
  #validateStoreDetails(storeDetails) {
    const missing = this.#findMissingFields(storeDetails, STORE_DETAILS_REQUIRED_FIELDS);
    if (missing.length > 0) {
      const error = new Error(`storeDetails ขาดข้อมูล: ${missing.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * เช็คความครบถ้วนของ hardware payload กรณีต้องสร้าง master data ใหม่
   * (ไม่มี product_model_id ส่งมา)
   */
  #validateNewHardwarePayload(category, hardware, specFields) {
    const missingMaster = this.#findMissingFields(hardware, MASTER_HARDWARE_REQUIRED_FIELDS);
    const missingSpec = this.#findMissingFields(hardware, specFields);
    const missing = [...missingMaster, ...missingSpec];
    
    if (missing.length > 0) {
      const error = new Error(`hardware ของ category "${category}" ขาดข้อมูล: ${missing.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // ---------- Private helpers: DB operations (ต้องอยู่ใน transaction เดียวกัน) ----------

  /**
   * สร้างแถวใหม่ในตาราง master_hardware
   */
  async #createMasterHardware(tx, category, hardware) {
    
    return tx.master_hardware.create({
      data: {
        hardwareKey: hardware.hardware_key,
        displayName: hardware.display_name,
        brand: hardware.brand,
        category,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * สร้างแถวในตารางสเปกเฉพาะทาง (cpus / rams / vgas / mainboards / storages / psus)
   * โดยดึงเฉพาะ field ตามที่ config กำหนดของ category นั้น ๆ
   */
  async #createCategorySpecRecord(tx, config, masterId, hardware) {
    const specData = config.specFields.reduce((acc, field) => {
      acc[field] = hardware[field];
      return acc;
    }, {});

    return tx[config.table].create({
      data: {
        masterId,
        ...specData,
      },
    });
  }

  /**
   * หา masterId ของสเปกที่มีอยู่แล้ว จาก product_model_id ที่ client เลือกจาก dropdown
   * พร้อมเช็คว่า category ตรงกับที่ระบุมาไหม กัน client ส่ง id ผิดหมวด
   */
  async #resolveExistingMasterId(tx, category, productModelId) {
    const existing = await tx.master_hardware.findUnique({
      where: { masterId: Number(productModelId) },
    });

    if (!existing) {
      const error = new Error(`ไม่พบข้อมูลสเปก productModelId: ${productModelId}`);
      error.statusCode = 404;
      throw error;
    }

    if (existing.category !== category) {
      const error = new Error(
        `productModelId: ${productModelId} เป็นหมวด "${existing.category}" ไม่ตรงกับ category "${category}" ที่ระบุ`,
      );
      error.statusCode = 400;
      throw error;
    }

    return existing.masterId;
  }

  /**
   * สร้าง master data ใหม่ทั้งคู่ (master_hardware + ตารางเฉพาะทาง) แล้วคืน masterId
   */
  async #createNewMasterData(tx, category, config, hardware) {
    this.#validateNewHardwarePayload(category, hardware, config.specFields);

    const masterRecord = await this.#createMasterHardware(tx, category, hardware);
    await this.#createCategorySpecRecord(tx, config, masterRecord.masterId, hardware);

    return masterRecord.masterId;
  }


    // ---------- Private helpers: validation & param parsing ----------

  /**
   * แปลงข้อมูล master_hardware (ที่ join ตารางเฉพาะทางมาแล้ว) ให้เป็นรูปแบบที่ frontend ใช้แสดงผล
   */
  #formatHardwareListItem(masterRecord, config, priceRangeByMasterId) {
    const specRecord = masterRecord[config.table] ?? {};
    const specs = config.specFields.reduce((acc, field) => {
      acc[field] = specRecord[field];
      return acc;
    }, {});
 
    const priceRange = priceRangeByMasterId.get(masterRecord.masterId) ?? { min: null, max: null };
 
    return {
      masterId: masterRecord.masterId,
      displayName: masterRecord.displayName,
      brand: masterRecord.brand,
      price: priceRange, // { min, max } รวมจากทุกร้านที่ขายสเปกนี้
      specs,
    };
  }

   /**
   * หาช่วงราคา (MIN/MAX) ของแต่ละ masterId จากตาราง shop_products ในครั้งเดียว (group by)
   * แทนที่จะ query ทีละตัวต่อ hardware หนึ่งชิ้น (กัน N+1)
   * คืนค่าเป็น Map<masterId, { min, max }>
   */
  async #getPriceRangeByMasterIds(masterIds) {
    if (masterIds.length === 0) {
      return new Map();
    }
 
    const grouped = await this.prisma.shop_products.groupBy({
      by: ['masterId'],
      where: { masterId: { in: masterIds } },
      _min: { price: true },
      _max: { price: true },
    });
 
    return new Map(
      grouped.map((row) => [row.masterId, { min: row._min.price, max: row._max.price }]),
    );
  }
 
  

  #buildWhereClause(category, search) {
    const where = {
      category,
      // ต้องมีอย่างน้อย 1 ร้านขายอยู่จริง ไม่งั้นลูกค้าเลือกไปก็ซื้อไม่ได้
      shop_products: { some: {} },
    };
 
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
 
    return where;
  }

   #mapToResponse(product) {
    return {
      shopProductId: product.shopProductId,
      masterId: product.masterId,
      category: product.master_hardware.category,
      brand: product.master_hardware.brand,
      customTitle: product.customTitle,
      price: Number(product.price),
      description: product.description,
      productStatus: product.productStatus,
      imageUrl: product.imageUrl,
      updatedAt: product.updatedAt,
    };
  }

  #findShopByUserId(userId) {
    return this.prisma.shops.findUnique({ where: { userId } });
  }

  #filterAllowedFields(body = {}) {
    return ALLOWED_UPDATE_FIELDS.reduce((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        acc[field] = body[field];
      }
      return acc;
    }, {});
  }

  #pickChangedFields(updated, updateData) {
    return Object.keys(updateData).reduce((acc, field) => {
      acc[field] = field === 'price' ? Number(updated[field]) : updated[field];
      return acc;
    }, {});
  }

  // ---------- Public API ----------

  /**
   * เพิ่มสินค้าใหม่เข้าร้านค้า
   * @param {number} shopId - มาจาก token ของร้านค้าที่ login อยู่
   * @param {object} payload - { category, hardware, storeDetails }
   * @returns {Promise<object>} ข้อมูลสินค้าที่เพิ่มสำเร็จ พร้อม flag isNewMasterDataCreated
   */

  async normalizePagination(page, limit) {
    const pageNumber = Math.max(1, Math.trunc(Number(page)) || DEFAULT_PAGE);
    const limitNumber = Math.min(
     MAX_LIMIT,
     Math.max(1, Math.trunc(Number(limit)) || DEFAULT_LIMIT),
    );
 
    return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
  }
  async addProductToStore(userId, payload) {
    const { category, hardware, storeDetails } = payload ?? {};
    
    const shop = await this.prisma.shops.findFirst({
      where: { userId: userId }
    });
    const shopId = shop?.shopId;
    // 2. ถ้าไม่มีร้านค้า ให้โยน Error กลับไปให้ Controller จัดการ
    if (!shop) {
      const error = new Error("ไม่พบข้อมูลร้านค้าของคุณ กรุณาเปิดร้านค้าก่อนทำรายการ");
      error.statusCode = 403;
      throw error;
    }

    if (!category || !hardware || !storeDetails) {
      const error = new Error('ต้องระบุ category, hardware และ storeDetails ให้ครบ');
      error.statusCode = 400;
      throw error;
    }
    
    const config = this.#getCategoryConfigOrThrow(category);
    this.#validateStoreDetails(storeDetails);

    const isCreatingNewMasterData = !hardware.productModelId;
   
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const masterId = isCreatingNewMasterData
          ? await this.#createNewMasterData(tx, category, config, hardware)
          : await this.#resolveExistingMasterId(tx, category, hardware.productModelId);

        const shop_products = await tx.shop_products.create({
          data: {
            shopId,
            masterId,
            customTitle: storeDetails.customTitle,
            price: storeDetails.price,
            warranty: storeDetails.warranty,
            description: storeDetails.description,
            imageUrl: storeDetails.imageUrl,
            updatedAt: new Date(),
          },
        });

        return { shop_products, masterId };
      });

      return {
        shopProductId: result.shop_products.shopProductId,
        category,
        productModelId: result.masterId,
        customTitle: result.shop_products.customTitle,
        isNewMasterDataCreated: isCreatingNewMasterData,
      };
    } catch (err) {
      // ดักจับกรณี hardwareKey ชนกันให้ตอบ 409 แทนที่จะหลุดเป็น 500
      if (err.code === 'P2002') {
        const error = new Error('hardwareKey นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูลอีกครั้ง');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  async getHardwareByCategory(category, { page, limit, search } = {}) {
    const config = this.#getCategoryConfigOrThrow(category);
    const { pageNumber, limitNumber, skip } = this.normalizePagination(page, limit);
    const where = this.#buildWhereClause(category, search);
 
    // Step 1: ดึง master_hardware ตามหน้าที่ต้องการ พร้อม join ตารางสเปกเฉพาะทาง
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.master_hardware.findMany({
        where,
        include: { [config.table]: true },
        orderBy: { masterId: 'asc' },
        skip,
        take: limitNumber,
      }),
      this.prisma.master_hardware.count({ where }),
    ]);
  
    // Step 2: เอาเฉพาะ masterId ที่อยู่ในหน้านี้ไปหาช่วงราคา (ไม่ scan ทั้งตาราง shop_products)
    const masterIds = items.map((item) => item.masterId);
    
    const priceRangeByMasterId = await this.#getPriceRangeByMasterIds(masterIds);
    
    // Step 3: ประกอบ response
    const data = items.map((item) =>
      this.#formatHardwareListItem(item, config, priceRangeByMasterId),
    );
    
 
    return {
      data,
      meta: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limitNumber)),
      },
    };
  }

   async getShopProducts(userId, { category, search, page, limit } = {}) {

    const shop = await this.#findShopByUserId(userId);
    if (!shop) {
      const error = new Error('Shop not found for this user');
      error.statusCode = 403;
      throw error;
    }
    const shopId = shop.shopId;

    const { pageNumber, limitNumber } = await this.normalizePagination(page, limit);

    const where = {
      shopId,
      ...(category && { master_hardware: { category } }),
      ...(search && { customTitle: { contains: search, mode: 'insensitive' } }),
    };
    
    const [products, totalItems] = await Promise.all([
      this.prisma.shop_products.findMany({
        where,
        include: { master_hardware: true },
        orderBy: { updatedAt: 'desc' },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      this.prisma.shop_products.count({ where }),
    ]);

    return {
      products: products.map((product) => this.#mapToResponse(product)),
      totalItems,
      meta: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNumber) || 0,
      },
    };
  }

  async updateShopProduct(userId, shopProductId, body) {
  const shop = await this.#findShopByUserId(userId);
  if (!shop) {
    const error = new Error('Shop not found for this user');
    error.statusCode = 403;
    throw error;
  }

  const updateData = this.#filterAllowedFields(body);

  if (Object.keys(updateData).length === 0) {
    const error = new Error('ไม่มีข้อมูลสำหรับอัปเดต');
    error.statusCode = 400;
    throw error;
  }

  const product = await this.prisma.shop_products.findUnique({
    where: { shopProductId: Number(shopProductId) },
  });

  if (!product) {
    const error = new Error('ไม่พบรายการสินค้านี้ในระบบ');
    error.statusCode = 404;
    throw error;
  }

  if (product.shopId !== shop.shopId) {
    const error = new Error('คุณไม่มีสิทธิ์แก้ไขสินค้ารายการนี้');
    error.statusCode = 403;
    throw error;
  }

  const updated = await this.prisma.shop_products.update({
    where: { shopProductId: product.shopProductId },
    data: { ...updateData, updatedAt: new Date() },
  });

  return {
    shopProductId: updated.shopProductId,
    updatedAt: updated.updatedAt,
    ...this.#pickChangedFields(updated, updateData),
  };
}
}

export { ProductService };
export default new ProductService();