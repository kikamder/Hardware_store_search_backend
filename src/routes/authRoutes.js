const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/google', (req, res) => authController.googleLogin(req, res));

module.exports = router;