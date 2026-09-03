import express from 'express';
import ShopController from '../controllers/shopController.js';
import roleCheck from '../middlewares/roleMiddleware.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
const router = express.Router();


router.get('/:shopId/getProfile', ShopController.getProfile);
router.get('/:shopId/products', ShopController.getProducts);

router.get('/stores',verifyToken,roleCheck('ADMIN'), ShopController.getStores);
router.get('/stores/:shopId',verifyToken,roleCheck('ADMIN'), ShopController.getStoreDetail);
router.put('/stores/:shopId/status',verifyToken,roleCheck('ADMIN'), ShopController.updateStoreStatus);

router.use(verifyToken, roleCheck('SHOP')); 
router.post('/products',ShopController.addProduct);
router.get('/dashboard', ShopController.getDashboard);
router.put('/profile', ShopController.updateProfile);
router.get('/products', ShopController.getShopProducts);
router.put('/products/:shopProductId', ShopController.updateShopProduct);
export default router;