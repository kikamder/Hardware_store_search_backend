import express from 'express';
import authController from '../controllers/authController.js'; 
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/google', (req, res) => authController.googleLogin(req, res));
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);     
router.post('/refresh', authController.refreshToken);

export default router;