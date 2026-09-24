const { v4: uuidv4 } = require('uuid');
const { readData, modifyData, withFileLock, writeDirect } = require('../utils/fileHelper');

/**
 * View current authenticated user's cart.
 */
async function getCart(req, res, next) {
  try {
    const userId = req.session.user.id;
    const carts = await readData('carts.json');
    const userCart = carts.find((c) => c.userId === userId);

    if (!userCart) {
      return res.status(200).json({
        success: true,
        cart: {
          userId,
          items: [],
          cartTotal: 0,
          updatedAt: new Date().toISOString()
        }
      });
    }

    return res.status(200).json({
      success: true,
      cart: userCart
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a product to the user's cart with inventory validation.
 */
async function addItemToCart(req, res, next) {
  try {
    const userId = req.session.user.id;
    const { productId, quantity } = req.body || {};

    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "productId" is required and must be a string'
      });
    }

    if (quantity === undefined || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "quantity" is required and must be a positive integer greater than 0'
      });
    }

    const cleanProductId = productId.trim();
    const cleanQty = quantity;

    // Mutex lock carts to safely update user cart
    const result = await withFileLock('carts.json', async () => {
      // Check product existence and availability
      const products = await readData('products.json');
      const product = products.find((p) => p.id === cleanProductId);

      if (!product) {
        const err = new Error(`Product with ID "${cleanProductId}" not found`);
        err.statusCode = 404;
        throw err;
      }

      if (product.stock <= 0) {
        const err = new Error('Out of stock');
        err.statusCode = 400;
        err.availableStock = 0;
        throw err;
      }

      const carts = await readData('carts.json');
      let cart = carts.find((c) => c.userId === userId);

      if (!cart) {
        cart = {
          userId,
          items: [],
          cartTotal: 0,
          updatedAt: new Date().toISOString()
        };
        carts.push(cart);
      }

      const existingItem = cart.items.find((item) => item.productId === cleanProductId);
      const existingQty = existingItem ? existingItem.quantity : 0;
      const totalRequestedQty = existingQty + cleanQty;

      if (totalRequestedQty > product.stock) {
        const err = new Error(`Insufficient stock. Requested: ${totalRequestedQty}, Available: ${product.stock}`);
        err.statusCode = 400;
        err.details = {
          availableStock: product.stock,
          inCart: existingQty,
          requested: cleanQty
        };
        throw err;
      }

      if (existingItem) {
        existingItem.quantity = totalRequestedQty;
        existingItem.name = product.name;
        existingItem.unitPrice = product.price;
        existingItem.itemTotal = existingItem.quantity * existingItem.unitPrice;
      } else {
        cart.items.push({
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: cleanQty,
          itemTotal: cleanQty * product.price
        });
      }

      cart.cartTotal = cart.items.reduce((sum, item) => sum + item.itemTotal, 0);
      cart.updatedAt = new Date().toISOString();

      await writeDirect('carts.json', carts);
      return cart;
    });

    return res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      cart: result
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        ...(err.availableStock !== undefined && { availableStock: err.availableStock }),
        ...(err.details && err.details)
      });
    }
    next(err);
  }
}

/**
 * Remove a specific product from the current user's cart.
 */
async function removeItemFromCart(req, res, next) {
  try {
    const userId = req.session.user.id;
    const { productId } = req.params;

    let updatedUserCart = null;

    await modifyData('carts.json', async (carts) => {
      const cart = carts.find((c) => c.userId === userId);

      if (!cart || !cart.items || !cart.items.some((i) => i.productId === productId)) {
        const err = new Error('Product not in cart');
        err.statusCode = 404;
        throw err;
      }

      cart.items = cart.items.filter((item) => item.productId !== productId);
      cart.cartTotal = cart.items.reduce((sum, item) => sum + item.itemTotal, 0);
      cart.updatedAt = new Date().toISOString();
      updatedUserCart = cart;

      return carts;
    });

    return res.status(200).json({
      success: true,
      message: 'Product removed from cart successfully',
      cart: updatedUserCart
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
 * Checkout cart: validate inventory, decrement stock, and clear cart.
 */
async function checkout(req, res, next) {
  try {
    const userId = req.session.user.id;

    // Mutex lock both products and carts to perform an atomic transaction
    const result = await withFileLock('products.json', async () => {
      return await withFileLock('carts.json', async () => {
        const carts = await readData('carts.json');
        const cart = carts.find((c) => c.userId === userId);

        if (!cart || !cart.items || cart.items.length === 0) {
          const err = new Error('Cart is empty');
          err.statusCode = 400;
          throw err;
        }

        const products = await readData('products.json');
        const problemItems = [];
        const priceChanges = [];

        // Validate all cart items against current product catalog and stock
        for (const item of cart.items) {
          const product = products.find((p) => p.id === item.productId);

          if (!product) {
            problemItems.push({
              productId: item.productId,
              name: item.name,
              reason: 'Product no longer exists in catalog',
              requestedQuantity: item.quantity,
              availableStock: 0
            });
          } else if (item.quantity > product.stock) {
            problemItems.push({
              productId: item.productId,
              name: product.name,
              reason: 'Insufficient stock available',
              requestedQuantity: item.quantity,
              availableStock: product.stock
            });
          }
        }

        // If any item fails validation, fail checkout without modifying stock or cart
        if (problemItems.length > 0) {
          const err = new Error('Checkout failed: one or more items have insufficient stock or are no longer available');
          err.statusCode = 400;
          err.problemItems = problemItems;
          throw err;
        }

        // Process stock decrement and build order summary
        const orderItems = [];
        let finalOrderTotal = 0;

        for (const item of cart.items) {
          const product = products.find((p) => p.id === item.productId);

          // Track price change if price updated since addition to cart
          if (product.price !== item.unitPrice) {
            priceChanges.push({
              productId: product.id,
              name: product.name,
              cartPrice: item.unitPrice,
              currentPrice: product.price,
              notice: `Price changed from ₹${item.unitPrice} to ₹${product.price}`
            });
          }

          product.stock -= item.quantity;
          const currentUnitPrice = product.price;
          const itemTotal = currentUnitPrice * item.quantity;
          finalOrderTotal += itemTotal;

          orderItems.push({
            productId: product.id,
            name: product.name,
            unitPrice: currentUnitPrice,
            quantity: item.quantity,
            itemTotal
          });
        }

        // Save updated products stock using writeDirect
        await writeDirect('products.json', products);

        // Clear user's cart
        cart.items = [];
        cart.cartTotal = 0;
        cart.updatedAt = new Date().toISOString();
        await writeDirect('carts.json', carts);

        const order = {
          orderId: `ord_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
          userId,
          items: orderItems,
          totalAmount: finalOrderTotal,
          placedAt: new Date().toISOString()
        };

        return {
          order,
          priceChanges
        };
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      order: result.order,
      ...(result.priceChanges.length > 0 && { priceChanges: result.priceChanges })
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        ...(err.problemItems && { problemItems: err.problemItems })
      });
    }
    next(err);
  }
}

module.exports = {
  getCart,
  addItemToCart,
  removeItemFromCart,
  checkout
};
