import productServiceInstance from '../services/productService.js';
import matchStoreServiceInstance from '../services/matchStoreService.js';
import hardwareServiceInstance from '../services/hardwareService.js';

const VALID_CATEGORIES = ['CPU', 'RAM', 'VGA', 'MAINBOARD', 'STORAGE', 'PSU'];

class HardwareController {
  constructor({ 
        matchStoreService = matchStoreServiceInstance
        
    } = {}) {
        
        this.matchStoreService = matchStoreService;
        this.matchStores = this.matchStores.bind(this);
    }

  // ---------- Route handlers ----------

  

  async matchStores(req, res) {
    try {
      const { hardwareList, userLocation } = req.body ?? {};
 
      const data = await this.matchStoreService.matchStoresByHardwareList({
        hardwareList,
        userLocation,
      });
 
      res.status(200).json({
        status: 'success',
        message: `ค้นหาและจับคู่ร้านค้าสำเร็จ พบร้านค้าที่ตรงเงื่อนไข ${data.length} ร้าน`,
        data,
      });
    } catch (error) {
      // error ที่โยนมาจาก service ชั้นนี้จะแนบ statusCode (และ details ถ้ามี) มาด้วย
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
          errorDetails: error.details ?? null,
        });
      }
 
      console.error('Match Stores Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        errorDetails: null,
      });
    }
  }

  

}

export { HardwareController };
export default new HardwareController();