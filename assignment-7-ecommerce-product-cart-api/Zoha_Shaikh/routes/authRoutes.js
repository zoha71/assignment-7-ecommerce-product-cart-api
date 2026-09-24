const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register - Register a new customer
router.post('/register', authController.register);

// POST /api/auth/login - Authenticate and create session
router.post('/login', authController.login);

// POST /api/auth/logout - Terminate session
router.post('/logout', authController.logout);

// GET /api/auth/me - View current authenticated user
router.get('/me', authController.getProfile);

module.exports = router;
