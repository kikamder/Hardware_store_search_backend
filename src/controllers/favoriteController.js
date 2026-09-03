import favoriteServiceInstance from '../services/favoriteService.js';

class FavoriteController {
  constructor({ favoriteService = favoriteServiceInstance } = {}) {
    this.favoriteService = favoriteService;

    this.addFavorite = this.addFavorite.bind(this);
    this.getFavorites = this.getFavorites.bind(this);
    this.removeFavorite = this.removeFavorite.bind(this);
    this.addFavoriteShop = this.addFavoriteShop.bind(this);
    this.getFavoriteShops = this.getFavoriteShops.bind(this);
    this.removeFavoriteShop = this.removeFavoriteShop.bind(this);
  }

    // ---------- Route handlers ----------

  async addFavorite(req, res) {
    try {
        const customerId = req.user.userId;
        const { shopProductId } = req.body || {};
        
        
        if (!Number.isInteger(shopProductId)) {
            return res.status(400).json({
                status: 'error',
                message: 'shopProductId ต้องเป็นตัวเลข',
            });
        }

        const exists = await this.favoriteService.shopProductExists(shopProductId);
        if (!exists) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบสินค้าที่ระบุ',
            });
        }

        const favorite = await this.favoriteService.addFavorite(customerId, shopProductId);

        res.status(201).json({
            status: 'success',
            message: 'เพิ่มสินค้าลงในรายการที่ชื่นชอบสำเร็จ',
            data: favorite,
        });
    } catch (error) {
      console.error('Add Favorite Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  async getFavorites(req, res) {
    try {
      const customerId = req.user.userId;
 
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
 
      const category = req.query.category?.toUpperCase();
      if (category && !HARDWARE_CATEGORIES.includes(category)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid category. Must be one of: ${HARDWARE_CATEGORIES.join(', ')}`,
        });
      }
 
      const { products, totalItems } = await this.favoriteService.getFavorites(customerId, {
        page,
        limit,
        category,
      });
 
      res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายการสินค้าที่ชื่นชอบสำเร็จ',
        data: products,
        meta: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      });
    } catch (error) {
      console.error('Get Favorites Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }


  async removeFavorite(req, res) {
    try {
      const customerId = req.user.userId;
      const shopProductId = Number(req.params.shopProductId);
 
      if (!Number.isInteger(shopProductId)) {
        return res.status(400).json({
          status: 'error',
          message: 'shopProductId ต้องเป็นตัวเลข',
        });
      }
 
      await this.favoriteService.removeFavorite(customerId, shopProductId);
 
      res.status(200).json({
        status: 'success',
        message: 'ลบสินค้าออกจากรายการที่ชื่นชอบสำเร็จ',
      });
    } catch (error) {
      console.error('Remove Favorite Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  async addFavoriteShop(req, res) {
    try {
      const customerId = req.user.userId;
      const { shopId } = req.body || {};
 
      if (!Number.isInteger(shopId)) {
        return res.status(400).json({
          status: 'error',
          message: 'ข้อมูลไม่ถูกต้อง',
        });
      }
 
      const exists = await this.favoriteService.shopExists(shopId);
      if (!exists) {
        return res.status(404).json({
          status: 'error',
          message: 'ไม่พบร้านค้าที่ระบุ',
        });
      }
 
      const favorite = await this.favoriteService.addFavoriteShop(customerId, shopId);
 
      res.status(201).json({
        status: 'success',
        message: 'บันทึกร้านค้าที่ชื่นชอบสำเร็จ',
        data: favorite,
      });
    } catch (error) {
      console.error('Add Favorite Shop Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

   async getFavoriteShops(req, res) {
    try {
      const customerId = req.user.userId;
 
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
 
      const { shops, totalItems } = await this.favoriteService.getFavoriteShops(customerId, {
        page,
        limit,
      });
 
      res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลรายการร้านค้าที่ชื่นชอบสำเร็จ',
        data: shops,
        meta: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      });
    } catch (error) {
      console.error('Get Favorite Shops Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  async removeFavoriteShop(req, res) {
    try {
      const customerId = req.user.userId;
      const shopId = Number(req.params.shopId);
 
      if (!Number.isInteger(shopId)) {
        return res.status(400).json({
          status: 'error',
          message: 'ข้อมูลไม่ถูกต้อง โปรดตรวจสอบข้อมูลที่ส่งมาอีกครั้ง',
        });
      }
 
      await this.favoriteService.removeFavoriteShop(customerId, shopId);
 
      res.status(200).json({
        status: 'success',
        message: 'นำร้านค้าออกจากรายการชื่นชอบสำเร็จ',
      });
    } catch (error) {
      console.error('Remove Favorite Shop Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

}

export { FavoriteController };
export default new FavoriteController();