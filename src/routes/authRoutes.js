import express from 'express';
import authController from '../controllers/authController.js'; 

const router = express.Router();

router.post('/google', (req, res) => authController.googleLogin(req, res));

export default router;