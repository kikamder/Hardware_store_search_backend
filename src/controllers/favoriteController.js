import favoriteServiceInstance from '../services/favoriteService.js';

class FavoriteController {
  constructor({ favoriteService = favoriteServiceInstance } = {}) {
    this.favoriteService = favoriteService;

    this.addFavorite = this.addFavorite.bind(this);
  }

  async addFavorite(req, res) {
    try {
        const customerId = req.user.userId; // มาจาก verifyToken middleware
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
}

export { FavoriteController };
export default new FavoriteController();