import express from 'express';
import multer from 'multer';
import uploadController from '../controllers/fileuploadController.js';
import roleCheck from '../middlewares/roleMiddleware.js';
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });
router.use(roleCheck('ADMIN'));

router.post('/', upload.single('image'), uploadController.upload);

export default router;