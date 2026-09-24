/**
 * Middleware to validate product payloads for creation (POST) and update (PUT).
 */
function validateCreateProduct(req, res, next) {
  const { name, category, price, stock, rating } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "name" is required and must be a non-empty string'
    });
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "category" is required and must be a non-empty string'
    });
  }

  if (price === undefined || typeof price !== 'number' || isNaN(price) || price <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "price" is required and must be a positive number greater than 0'
    });
  }

  if (stock === undefined || typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "stock" is required and must be an integer greater than or equal to 0'
    });
  }

  if (rating !== undefined) {
    if (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "rating" must be a number between 0 and 5'
      });
    }
  }

  next();
}

function validateUpdateProduct(req, res, next) {
  const { name, category, price, stock, rating } = req.body || {};

  if (name === undefined && category === undefined && price === undefined && stock === undefined && rating === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: At least one updatable field (name, category, price, stock, rating) must be provided'
    });
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "name" must be a non-empty string'
    });
  }

  if (category !== undefined && (typeof category !== 'string' || !category.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "category" must be a non-empty string'
    });
  }

  if (price !== undefined && (typeof price !== 'number' || isNaN(price) || price <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "price" must be a positive number greater than 0'
    });
  }

  if (stock !== undefined && (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "stock" must be an integer greater than or equal to 0'
    });
  }

  if (rating !== undefined && (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 5)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "rating" must be a number between 0 and 5'
    });
  }

  next();
}

module.exports = {
  validateCreateProduct,
  validateUpdateProduct
};
