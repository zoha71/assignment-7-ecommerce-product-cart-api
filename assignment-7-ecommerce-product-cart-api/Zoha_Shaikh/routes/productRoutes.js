const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authGuard, requireAdmin } = require('../middleware/authGuard');
const { validateCreateProduct, validateUpdateProduct } = require('../middleware/validateProduct');

// GET /api/products - Filter, search, and sort product catalog
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Fetch single product by ID
router.get('/:id', productController.getProductById);

// POST /api/products - Add a new product (Admin only)
router.post('/', authGuard, requireAdmin, validateCreateProduct, productController.createProduct);

// PUT /api/products/:id - Update product details or stock (Admin only)
router.put('/:id', authGuard, requireAdmin, validateUpdateProduct, productController.updateProduct);

// DELETE /api/products/:id - Remove product from store (Admin only)
router.delete('/:id', authGuard, requireAdmin, productController.deleteProduct);

module.exports = router;
