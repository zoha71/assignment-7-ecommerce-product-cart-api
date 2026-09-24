const { v4: uuidv4 } = require('uuid');
const { readData, modifyData } = require('../utils/fileHelper');

const VALID_SORT_OPTIONS = ['price_asc', 'price_desc', 'rating_desc', 'newest', 'name_asc'];

/**
 * Filter, search, and sort product catalog.
 */
async function getAllProducts(req, res, next) {
  try {
    const { category, minPrice, maxPrice, inStock, search, sort } = req.query;

    let products = await readData('products.json');

    // 1. Category filter (case-insensitive exact match)
    if (category) {
      const catLower = String(category).trim().toLowerCase();
      products = products.filter((p) => p.category && p.category.toLowerCase() === catLower);
    }

    // 2. minPrice filter (numeric, inclusive)
    if (minPrice !== undefined) {
      const min = Number(minPrice);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameter: "minPrice" must be a non-negative number'
        });
      }
      products = products.filter((p) => typeof p.price === 'number' && p.price >= min);
    }

    // 3. maxPrice filter (numeric, inclusive)
    if (maxPrice !== undefined) {
      const max = Number(maxPrice);
      if (isNaN(max) || max < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameter: "maxPrice" must be a non-negative number'
        });
      }
      products = products.filter((p) => typeof p.price === 'number' && p.price <= max);
    }

    // minPrice > maxPrice check
    if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameter: "minPrice" cannot be greater than "maxPrice"'
      });
    }

    // 4. inStock filter (inStock=true -> stock > 0)
    if (inStock !== undefined) {
      if (inStock === 'true' || inStock === true) {
        products = products.filter((p) => typeof p.stock === 'number' && p.stock > 0);
      } else if (inStock === 'false' || inStock === false) {
        products = products.filter((p) => typeof p.stock === 'number' && p.stock === 0);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameter: "inStock" must be "true" or "false"'
        });
      }
    }

    // 5. search filter (case-insensitive substring on name)
    if (search) {
      const searchLower = String(search).trim().toLowerCase();
      products = products.filter((p) => p.name && p.name.toLowerCase().includes(searchLower));
    }

    // 6. sorting
    if (sort) {
      if (!VALID_SORT_OPTIONS.includes(sort)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sort parameter: "${sort}". Valid options are: ${VALID_SORT_OPTIONS.join(', ')}`,
          validSortOptions: VALID_SORT_OPTIONS
        });
      }

      products.sort((a, b) => {
        switch (sort) {
          case 'price_asc':
            return (a.price || 0) - (b.price || 0);
          case 'price_desc':
            return (b.price || 0) - (a.price || 0);
          case 'rating_desc':
            return (b.rating || 0) - (a.rating || 0);
          case 'newest':
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          case 'name_asc':
            return String(a.name || '').localeCompare(String(b.name || ''));
          default:
            return 0;
        }
      });
    }

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch a single product by ID.
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const products = await readData('products.json');
    const product = products.find((p) => p.id === id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID "${id}" not found`
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new product (Admin only).
 */
async function createProduct(req, res, next) {
  try {
    const { name, category, price, stock, rating } = req.body;

    let createdProduct = null;

    await modifyData('products.json', async (products) => {
      const newProduct = {
        id: `prod_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        stock: Number(stock),
        rating: rating !== undefined ? Number(rating) : 0,
        createdAt: new Date().toISOString()
      };

      products.push(newProduct);
      createdProduct = newProduct;
      return products;
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: createdProduct
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing product (Admin only).
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { name, category, price, stock, rating } = req.body;

    let updatedProduct = null;

    await modifyData('products.json', async (products) => {
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) {
        const err = new Error(`Product with ID "${id}" not found`);
        err.statusCode = 404;
        throw err;
      }

      const existing = products[index];
      const updated = {
        ...existing,
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(price !== undefined && { price: Number(price) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(rating !== undefined && { rating: Number(rating) })
      };

      products[index] = updated;
      updatedProduct = updated;
      return products;
    });

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * Delete a product (Admin only).
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    let deleted = false;

    await modifyData('products.json', async (products) => {
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) {
        const err = new Error(`Product with ID "${id}" not found`);
        err.statusCode = 404;
        throw err;
      }

      products.splice(index, 1);
      deleted = true;
      return products;
    });

    return res.status(200).json({
      success: true,
      message: `Product with ID "${id}" deleted successfully`
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
