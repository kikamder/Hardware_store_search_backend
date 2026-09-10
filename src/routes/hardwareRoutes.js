import { Router } from 'express';
import hardwareController from '../controllers/hardwareController.js';
import matchStoreController from '../controllers/matchStoreController.js';
import roleCheck from '../middlewares/roleMiddleware.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/:category', hardwareController.getHardwareByCategory);
router.get('/:category/autocomplete', hardwareController.autocomplete);
router.post('/match-stores', matchStoreController.matchStores);

router.get('/:masterId/detail',verifyToken,roleCheck('SHOP'), hardwareController.getHardwareDetail);

export default router;