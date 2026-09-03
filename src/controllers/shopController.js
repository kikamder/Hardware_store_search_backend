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
    this.getDashboard = this.getDashboard.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.getShopProducts = this.getShopProducts.bind(this);
    this.updateShopProduct = this.updateShopProduct.bind(this);
    this.getStores = this.getStores.bind(this);
    this.getStoreDetail = this.getStoreDetail.bind(this);
    this.updateStoreStatus = this.updateStoreStatus.bind(this);
  }

  // ---------- Private helpers ----------

  
  //เช็คว่า field ที่บังคับ (required) ตามสเปกมีมาครบไหม
  //คืนค่า array ของชื่อ field ที่ขาด (ว่างถ้าครบ)
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

  
   //เช็คว่า body ของการเพิ่มสินค้ามีโครงสร้างหลักครบไหม (category / hardware / storeDetails)
   // คืนค่า array ของชื่อ field ที่ขาด (ว่างถ้าครบ)
  #validateAddProductFields(body) {
    const requiredTopLevelFields = ['category', 'hardware', 'storeDetails'];
    return requiredTopLevelFields.filter((field) => !body?.[field]);
  }

  
   // อัปโหลดไฟล์ทั้งหมดที่มีขึ้น Cloudinary พร้อมกัน
   // แล้ว return object ของ URL แต่ละรูป พร้อมส่งต่อให้ shopService บันทึกลง DB
   // ไฟล์ไหนไม่มีมา (เช่น businessRegImage ที่ไม่บังคับ) จะได้ค่า undefined ไป
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
      const userId = req.user.userId; 

      const missingFields = this.#validateRequiredFields(req.body);
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

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

  
  async addProduct(req, res) {
    try {
      
      const userId = req.user.userId; 

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

  async getDashboard(req, res) {
    try {
      const userId = req.user.userId; 
 
      const dashboard = await this.shopService.getDashboard(userId);
 
      if (!dashboard) {
        return res.status(404).json({
          status: 'error',
          message: 'ไม่พบข้อมูลร้านค้าของผู้ใช้งานนี้',
        });
      }
 
      res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูล Dashboard สำเร็จ',
        data: dashboard,
      });
    } catch (error) {
      console.error('Get Shop Dashboard Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'เกิดข้อผิดพลาดในการประมวลผลสถิติ โปรดลองใหม่อีกครั้ง',
      });
    }
  }

   async updateProfile(req, res) {
    try {
      const userId = req.user.userId;

      const updatedShop = await this.shopService.updateShopProfile(userId, req.body);
      return res.status(200).json({
        status: 'success',
        message: 'อัปเดตข้อมูลร้านค้าเรียบร้อยแล้ว',
        data: {
          shopId: updatedShop.shopId,
          shopName: updatedShop.shopName,
          updateData : req.body
        },
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'เกิดข้อผิดพลาดในระบบ',
      });
    }
  }

  async getShopProducts(req, res, next) {
    try {
      const userId = req.user.userId;
      const { category, search, page, limit } = req.query;

      const { products, totalItems, meta } = await this.productService.getShopProducts(
        userId,
        { category, search, page, limit },
      );

      return res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายการสินค้าสำเร็จ',
        data: { totalItems, products },
        meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateShopProduct(req, res, next) {
    try {
      const userId = req.user.userId;
      const { shopProductId } = req.params;

      const data = await this.productService.updateShopProduct(userId, shopProductId, req.body);
      
      return res.status(200).json({
        status: 'success',
        message: 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว',
        data,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async getStores(req, res, next) {
    try {
      const { page, limit, search, status } = req.query;

      const { summary, data, meta } = await this.shopService.getStores({
        page,
        limit,
        search,
        status,
      });

      return res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายชื่อร้านค้าเรียบร้อยแล้ว',
        summary,
        data,
        meta,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async getStores(req, res, next) {
    try {
      const { page, limit, search, status } = req.query;

      const { summary, data, meta } = await this.shopService.getStores({
        page,
        limit,
        search,
        status,
      });

      return res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายชื่อร้านค้าเรียบร้อยแล้ว',
        summary,
        data,
        meta,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async getStoreDetail(req, res, next) {
    try {
      const { shopId } = req.params;

      const data = await this.shopService.getStoreDetail(shopId);

      return res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายละเอียดร้านค้าเรียบร้อยแล้ว',
        data,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async updateStoreStatus(req, res, next) {
    try {
      const adminUserId = req.user.userId;
      const { shopId } = req.params;
      const { shopStatus } = req.body;

      const data = await this.shopService.updateStoreStatus(adminUserId, shopId, shopStatus);

      return res.status(200).json({
        status: 'success',
        message: `อัปเดตสถานะร้านค้าเป็น ${data.shopStatus} เรียบร้อยแล้ว`,
        data,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}


export { ShopController };
export default new ShopController();