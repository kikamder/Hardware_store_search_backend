import express from 'express';
import ShopController from '../controllers/shopController.js';
import roleCheck from '../middlewares/roleMiddleware.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
const router = express.Router();


router.get('/:shopId/getProfile', ShopController.getProfile);
router.get('/:shopId/products', ShopController.getProducts);

router.use(verifyToken);
router.use(roleCheck('SHOP'));
router.post('/products',ShopController.addProduct);

export default router;