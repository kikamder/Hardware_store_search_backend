import { Router } from 'express';
import hardwareController from '../controllers/hardwareController.js';
import matchStoreController from '../controllers/matchStoreController.js';
const router = Router();

// GET /api/hardware/:category - Public, ไม่ต้องแนบ Token
router.get('/:category', hardwareController.getHardwareByCategory);
router.get('/:category/autocomplete', hardwareController.autocomplete);
router.post('/match-stores', matchStoreController.matchStores);

export default router;