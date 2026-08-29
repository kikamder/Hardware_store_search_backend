import productServiceInstance from '../services/productService.js';
import matchStoreServiceInstance from '../services/matchStoreService.js';
import hardwareServiceInstance from '../services/hardwareService.js';

const VALID_CATEGORIES = ['CPU', 'RAM', 'VGA', 'MAINBOARD', 'STORAGE', 'PSU'];

class HardwareController {
  constructor({ 
        productService = productServiceInstance , 
        
        hardwareService = hardwareServiceInstance
    } = {}) {
        this.productService = productService;
        this.getHardwareByCategory = this.getHardwareByCategory.bind(this);
        
        this.hardwareService = hardwareService;
        this.autocomplete = this.autocomplete.bind(this);

    }

  // ---------- Route handlers ----------

  
  async getHardwareByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page, limit, search } = req.query;

      const result = await this.productService.getHardwareByCategory(category, {
        page,
        limit,
        search,
      });

      res.status(200).json({
        status: 'success',
        message: 'ดึงข้อมูลสำเร็จ',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      // error ที่โยนมาจาก service ชั้นนี้จะแนบ statusCode มาด้วย (เช่น 400 ถ้า category ไม่รองรับ)
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      console.error('Get Hardware By Category Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  a

  async autocomplete(req, res) {
    try {
      const category = req.params.category?.toUpperCase();
      const keyword = req.query.keyword?.trim();
 
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        });
      }
 
      if (!keyword) {
        return res.status(400).json({ error: 'Missing required query param: keyword' });
      }
 
      const data = await this.hardwareService.autocomplete(category, keyword);
 
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('Hardware Autocomplete Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}

export { HardwareController };
export default new HardwareController();