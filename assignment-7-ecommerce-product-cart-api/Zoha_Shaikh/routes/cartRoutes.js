const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authGuard } = require('../middleware/authGuard');

// All cart routes require active session authentication
router.use(authGuard);

// GET /api/cart - View current user's shopping cart
router.get('/', cartController.getCart);

// POST /api/cart/items - Add or increment item in shopping cart
router.post('/items', cartController.addItemToCart);

// DELETE /api/cart/items/:productId - Remove specific product from shopping cart
router.delete('/items/:productId', cartController.removeItemFromCart);

// POST /api/cart/checkout - Checkout cart, validate stock, decrement inventory
router.post('/checkout', cartController.checkout);

module.exports = router;
