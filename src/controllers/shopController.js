import shopServiceInstance from '../services/shopService.js';
import uploadService from '../services/fileuploadService.js';
import productServiceInstance from '../services/productService.js';

class ShopController {
  constructor({
    shopService = shopServiceInstance,
    fileUploadService = uploadService,
    productService = productServiceInstance,
  } = {}) {
    this.shopService = shopService;
    this.fileUploadService = fileUploadService;
    this.productService = productService;

    
    this.getProfile = this.getProfile.bind(this);
    this.registerShop = this.registerShop.bind(this);
    this.addProduct = this.addProduct.bind(this);
    this.getProducts = this.getProducts.bind(this);
  }

  // ---------- Private helpers ----------

  /**
   * เช็คว่า field ที่บังคับ (required) ตามสเปกมีมาครบไหม
   * คืนค่า array ของชื่อ field ที่ขาด (ว่างถ้าครบ)
   */
  #validateRequiredFields(body) {
    const requiredFields = [
      'ownerFirstName',
      'ownerLastName',
      'shopName',
      'addressText',
      'subDistrict',
      'district',
      'province',
      'zipCode',
      'contactChannels',
      'ownerPhone',
      'latitude',
      'longitude',
      'operatingHours',
    ];

    return requiredFields.filter((field) => !body[field]);
  }

  /**
   * เช็คว่า body ของการเพิ่มสินค้ามีโครงสร้างหลักครบไหม (category / hardware / storeDetails)
   * คืนค่า array ของชื่อ field ที่ขาด (ว่างถ้าครบ)
   */
  #validateAddProductFields(body) {
    const requiredTopLevelFields = ['category', 'hardware', 'storeDetails'];
    return requiredTopLevelFields.filter((field) => !body?.[field]);
  }

  /**
   * อัปโหลดไฟล์ทั้งหมดที่มีขึ้น Cloudinary พร้อมกัน (Promise.all)
   * แล้ว return object ของ URL แต่ละรูป พร้อมส่งต่อให้ shopService บันทึกลง DB
   * ไฟล์ไหนไม่มีมา (เช่น businessRegImage ที่ไม่บังคับ) จะได้ค่า undefined ไป
   */
  async #uploadShopImages(files, userId) {
    const uploadIfExists = (file, label) =>
      file ? this.fileUploadService.uploadImage(file.buffer, userId, label) : undefined;

    const [idCardImage, businessRegImage, storeImage, profileImageUrl] = await Promise.all([
      uploadIfExists(files?.idCardImage?.[0], 'idCard'),
      uploadIfExists(files?.businessRegImage?.[0], 'businessReg'),
      uploadIfExists(files?.storeImage?.[0], 'storeImage'),
      uploadIfExists(files?.profileImageUrl?.[0], 'profile'),
    ]);

    return { idCardImage, businessRegImage, storeImage, profileImageUrl };
  }

  // ---------- Route handlers ----------

  async registerShop(req, res) {
    try {
      const userId = req.user.userId; // มาจาก verifyToken middleware

      const missingFields = this.#validateRequiredFields(req.body);
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

      // รูปบัตรประชาชนกับรูปหน้าร้าน บังคับตามสเปก (businessRegImage ไม่บังคับ)
      if (!req.files?.idCardImage) {
        return res.status(400).json({ error: 'Missing required file: idCardImage' });
      }
      if (!req.files?.storeImage) {
        return res.status(400).json({ error: 'Missing required file: storeImage' });
      }

      const existingShop = await this.shopService.findShopByUserId(userId);
      if (existingShop) {
        return res.status(409).json({ error: 'คุณเคยลงทะเบียนร้านค้าไปแล้ว' });
      }

      const imageUrls = await this.#uploadShopImages(req.files, userId);

      const shop = await this.shopService.registerShop(userId, req.body, imageUrls);

      res.status(201).json({
        status: 'success',
        message: 'ลงทะเบียนสำเร็จ กรุณารอยืนยัน',
        data: {
          shopId: shop.shopId,
          shopStatus: shop.shopStatus,
        },
      });
    } catch (error) {
      console.error('Shop Register Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/stores/products
   * เพิ่มสินค้าใหม่เข้าร้านค้า โดยแยกบันทึกข้อมูลฮาร์ดแวร์ลงตารางเฉพาะทางตาม category
   * และผูก masterId เข้ากับ shop_products
   */
  async addProduct(req, res) {
    try {
      
      const userId = req.user.userId; // มาจาก verifyShopToken middleware

      const missingFields = this.#validateAddProductFields(req.body);
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

      const data = await this.productService.addProductToStore(userId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'เพิ่มสินค้าเข้าร้านค้าเรียบร้อยแล้ว',
        data,
      });
    } catch (error) {
      // error ที่โยนมาจาก service ชั้นนี้จะแนบ statusCode มาด้วย (400/404 เป็นต้น)
      // ถ้าไม่มี ให้ถือว่าเป็น error ไม่คาดคิด -> 500
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      console.error('Add Product Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req, res) {
    try {
      const shopId = Number(req.params.shopId);
 
      // shopId ต้องเป็นตัวเลขเท่านั้น ตามที่สเปกระบุ error case ไว้
      if (!Number.isInteger(shopId)) {
        return res.status(400).json({
          status: 'error',
          message: 'shopId ต้องเป็นตัวเลข',
        });
      }
 
      const shopProfile = await this.shopService.getShopProfile(shopId);
 
      if (!shopProfile) {
        return res.status(404).json({
          status: 'error',
          message: 'ไม่พบข้อมูลร้านค้าที่ระบุ',
        });
      }
 
      res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลร้านค้าสำเร็จ',
        data: shopProfile,
      });
    } catch (error) {
      console.error('Get Shop Profile Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  async getProducts(req, res) {
    try {
      const shopId = Number(req.params.shopId);
      if (!Number.isInteger(shopId)) {
        return res.status(400).json({ status: 'error', message: 'shopId ต้องเป็นตัวเลข' });
      }
 
      // page/limit ไม่บังคับตามสเปก ใช้ default 1/20 ถ้าไม่ส่งมา หรือส่งมาแบบแปลกๆ (parse ไม่ได้)
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
 
      const category = req.query.category?.toUpperCase();
      if (category && !HARDWARE_CATEGORIES.includes(category)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid category. Must be one of: ${HARDWARE_CATEGORIES.join(', ')}`,
        });
      }
 
      const result = await this.shopService.getShopProducts(shopId, { page, limit, category });
 
      if (!result) {
        return res.status(404).json({ status: 'error', message: 'ไม่พบข้อมูลร้านค้าที่ระบุ' });
      }
 
      res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายการสินค้าสำเร็จ',
        data: result.products,
        meta: {
          page,
          limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / limit),
        },
      });
    } catch (error) {
      console.error('Get Shop Products Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
}

export { ShopController };
export default new ShopController();