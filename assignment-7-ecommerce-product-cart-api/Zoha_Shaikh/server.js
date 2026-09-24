require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const logger = require('./middleware/logger');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ecommerce_secure_session_secret_key_2026';

// Enable trust proxy for Render / reverse proxies (needed for secure cookies behind HTTPS proxies)
app.set('trust proxy', 1);

// JSON body parser with malformed JSON error handling
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON in request body'
    });
  }
  next(err);
});

// URL-encoded form body parser
app.use(express.urlencoded({ extended: true }));

// Express session setup
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: NODE_ENV === 'production'
    }
  })
);

// Global custom request logger middleware
app.use(logger);

// Root endpoint: API documentation / welcome info
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the E-Commerce Product Catalog & Shopping Cart REST API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      products: {
        list: 'GET /api/products (filters: category, minPrice, maxPrice, inStock, search, sort)',
        getById: 'GET /api/products/:id',
        create: 'POST /api/products (Admin only)',
        update: 'PUT /api/products/:id (Admin only)',
        delete: 'DELETE /api/products/:id (Admin only)'
      },
      cart: {
        getCart: 'GET /api/cart',
        addItem: 'POST /api/cart/items',
        removeItem: 'DELETE /api/cart/items/:productId',
        checkout: 'POST /api/cart/checkout'
      }
    }
  });
});

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl || req.url} - Route not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start listening when executed directly
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 E-Commerce API server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`📡 Local URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
