import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middlewares/authMiddleware.js';
import  roleCheck  from '../middlewares/roleMiddleware.js';
import shopController from '../controllers/shopController.js';
import favoriteController from '../controllers/favoriteController.js';
import userController from '../controllers/usersController.js';
const router = express.Router();

// ⚠️ ตั้งค่า multer แบบง่ายไว้ก่อน — ถ้าโปรเจกต์คุณมี config อัปโหลดไฟล์กลาง
// อยู่แล้ว (เช่นจาก fileUploadRoute) แนะนำให้ import ตัวเดียวกันมาใช้ซ้ำ
// แทนที่จะตั้ง storage แยกใหม่ในไฟล์นี้ จะได้ path/destination เป็นมาตรฐานเดียวกัน
// ใช้ memoryStorage เพราะ uploadService.uploadImage() ต้องการ buffer
// (ไม่ใช้ diskStorage แล้ว เพราะไม่ต้องเก็บไฟล์ไว้ใน local disk ของ server เลย
// ส่งตรงขึ้น Cloudinary ทันทีแทน)

router.use(verifyToken);
router.get('/users',roleCheck('ADMIN'), userController.getUsers);
router.put('/users/:userId',roleCheck('ADMIN'), userController.updateUser);


router.use(verifyToken,roleCheck('CUSTOMER'));
const upload = multer({ storage: multer.memoryStorage() });
router.post('/shopRegister',upload.fields([
    { name: 'idCardImage', maxCount: 1 },
    { name: 'businessRegImage', maxCount: 1 },
    { name: 'storeImage', maxCount: 1 },
    { name: 'profileImageUrl', maxCount: 1 },
    ]),shopController.registerShop);

router.post('/favorites/products',favoriteController.addFavorite);
router.get('/favorites/products',favoriteController.getFavorites);
router.delete('/favorites/products/:shopProductId', favoriteController.removeFavorite);

router.post('/favorites/stores', favoriteController.addFavoriteShop);
router.get('/favorites/stores', favoriteController.getFavoriteShops);
router.delete('/favorites/stores/:shopId', favoriteController.removeFavoriteShop);



export default router;
