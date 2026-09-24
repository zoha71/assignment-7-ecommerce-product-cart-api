const http = require('http');
const app = require('./server');
const fs = require('fs/promises');
const path = require('path');
const seedAdmin = require('./scripts/seedAdmin');

let server;
const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let customerCookie = '';
let adminCookie = '';

function request(method, path, body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      const setCookieHeader = res.headers['set-cookie'];
      let newCookie = '';
      if (setCookieHeader) {
        newCookie = setCookieHeader.map((c) => c.split(';')[0]).join('; ');
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookie: newCookie,
          body: json
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function resetCleanSeedState() {
  console.log('\n🔄 Resetting data files to pristine seed state...');
  await seedAdmin();

  const seedProducts = [
    {
      id: 'prod_101',
      name: 'Wireless Noise-Canceling Headphones',
      category: 'Electronics',
      price: 2999,
      stock: 15,
      rating: 4.6,
      createdAt: '2026-03-01T10:00:00.000Z'
    },
    {
      id: 'prod_102',
      name: 'RGB Mechanical Gaming Keyboard',
      category: 'Electronics',
      price: 3499,
      stock: 8,
      rating: 4.8,
      createdAt: '2026-03-02T11:00:00.000Z'
    },
    {
      id: 'prod_103',
      name: 'Oversized Cotton Graphic Hoodie',
      category: 'Clothing',
      price: 1499,
      stock: 20,
      rating: 4.3,
      createdAt: '2026-03-03T09:30:00.000Z'
    },
    {
      id: 'prod_104',
      name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      category: 'Books',
      price: 799,
      stock: 3,
      rating: 4.9,
      createdAt: '2026-03-04T14:15:00.000Z'
    },
    {
      id: 'prod_105',
      name: 'Stainless Steel Insulated Water Bottle 1L',
      category: 'Sports',
      price: 599,
      stock: 0,
      rating: 4.1,
      createdAt: '2026-03-05T08:00:00.000Z'
    },
    {
      id: 'prod_106',
      name: 'Ceramic Pour-Over Coffee Maker Set',
      category: 'Home & Kitchen',
      price: 1299,
      stock: 12,
      rating: 4.5,
      createdAt: '2026-03-06T16:45:00.000Z'
    }
  ];

  await fs.writeFile(path.join(__dirname, 'data/products.json'), JSON.stringify(seedProducts, null, 2) + '\n', 'utf-8');
  await fs.writeFile(path.join(__dirname, 'data/carts.json'), '[]\n', 'utf-8');
  console.log('✅ Clean seed state established.');
}

async function runTests() {
  await resetCleanSeedState();

  server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`\n🧪 Test server running on port ${PORT}\n`);
  });

  try {
    // 1. Health & Root Info
    console.log('--- TEST GROUP 1: Health & Root Endpoints ---');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.status === 'ok', 'GET /health returns 200 OK with status ok');

    const root = await request('GET', '/');
    assert(root.status === 200 && root.body.success === true, 'GET / returns 200 OK with endpoint documentation');

    // 2. Auth Tests
    console.log('\n--- TEST GROUP 2: Authentication & Sessions ---');
    // Unauthenticated cart access
    const unauthCart = await request('GET', '/api/cart');
    assert(unauthCart.status === 401 && unauthCart.body.success === false, 'Unauthenticated GET /api/cart returns 401 Unauthorized');

    // Register test customer
    const regRes = await request('POST', '/api/auth/register', {
      username: 'alex',
      email: 'alex@shop.com',
      password: 'password123'
    });
    assert(regRes.status === 201 && regRes.body.success === true && regRes.body.user.email === 'alex@shop.com', 'POST /api/auth/register creates user (201 Created)');
    assert(regRes.body.user.passwordHash === undefined, 'User registration never leaks passwordHash');

    // Duplicate register rejection
    const dupRes = await request('POST', '/api/auth/register', {
      username: 'alex_duplicate',
      email: 'alex@shop.com',
      password: 'password123'
    });
    assert(dupRes.status === 400 && dupRes.body.success === false, 'Duplicate email registration returns 400 Bad Request');

    // Invalid password register
    const shortPwRes = await request('POST', '/api/auth/register', {
      username: 'short',
      email: 'short@shop.com',
      password: '123'
    });
    assert(shortPwRes.status === 400, 'Registration with password < 6 chars returns 400 Bad Request');

    // Login customer
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'alex@shop.com',
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.body.success === true, 'POST /api/auth/login returns 200 OK');
    customerCookie = loginRes.cookie;
    assert(customerCookie.includes('connect.sid'), 'Login returns session cookie');

    // Login admin
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@shop.com',
      password: 'Admin@123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin', 'Admin login successful with role: admin');
    adminCookie = adminLoginRes.cookie;

    // Login with wrong password
    const badLogin = await request('POST', '/api/auth/login', {
      email: 'alex@shop.com',
      password: 'wrongpassword'
    });
    assert(badLogin.status === 401, 'Invalid password returns 401 Unauthorized');

    // 3. Product Catalog & Search/Filter/Sort Engine
    console.log('\n--- TEST GROUP 3: Product Catalog Engine (Filtering, Sorting, Searching) ---');
    // List all
    const allProd = await request('GET', '/api/products');
    assert(allProd.status === 200 && allProd.body.count === 6, 'GET /api/products returns all 6 products');

    // Filter by Category
    const catProd = await request('GET', '/api/products?category=electronics');
    assert(catProd.status === 200 && catProd.body.count === 2, 'GET /api/products?category=electronics returns 2 items (case-insensitive)');

    // Filter by Price range
    const priceProd = await request('GET', '/api/products?minPrice=1000&maxPrice=3000');
    assert(priceProd.status === 200 && priceProd.body.products.every((p) => p.price >= 1000 && p.price <= 3000), 'GET /api/products?minPrice=1000&maxPrice=3000 filters within price range');

    // Filter inStock=true
    const inStockProd = await request('GET', '/api/products?inStock=true');
    assert(inStockProd.status === 200 && inStockProd.body.products.every((p) => p.stock > 0), 'GET /api/products?inStock=true excludes out-of-stock items');

    // Search by name
    const searchProd = await request('GET', '/api/products?search=keyboard');
    assert(searchProd.status === 200 && searchProd.body.count === 1 && searchProd.body.products[0].id === 'prod_102', 'GET /api/products?search=keyboard finds matching item');

    // Sorting tests
    const sortPriceAsc = await request('GET', '/api/products?sort=price_asc');
    const pricesAsc = sortPriceAsc.body.products.map((p) => p.price);
    assert(pricesAsc[0] <= pricesAsc[1] && pricesAsc[1] <= pricesAsc[2], 'GET /api/products?sort=price_asc sorts ascending');

    const sortPriceDesc = await request('GET', '/api/products?sort=price_desc');
    const pricesDesc = sortPriceDesc.body.products.map((p) => p.price);
    assert(pricesDesc[0] >= pricesDesc[1] && pricesDesc[1] >= pricesDesc[2], 'GET /api/products?sort=price_desc sorts descending');

    const sortRatingDesc = await request('GET', '/api/products?sort=rating_desc');
    const ratings = sortRatingDesc.body.products.map((p) => p.rating);
    assert(ratings[0] >= ratings[1], 'GET /api/products?sort=rating_desc sorts highest rated first');

    // Invalid sort error
    const badSort = await request('GET', '/api/products?sort=invalid_sort');
    assert(badSort.status === 400 && badSort.body.validSortOptions !== undefined, 'Invalid sort parameter returns 400 Bad Request with valid options list');

    // Get single product by ID
    const singleProd = await request('GET', '/api/products/prod_101');
    assert(singleProd.status === 200 && singleProd.body.product.name === 'Wireless Noise-Canceling Headphones', 'GET /api/products/:id returns product');

    const missingProd = await request('GET', '/api/products/prod_non_existent');
    assert(missingProd.status === 404, 'GET /api/products/non_existent returns 404 Not Found');

    // 4. Admin Product Management (POST / PUT / DELETE) & Authorization
    console.log('\n--- TEST GROUP 4: Admin Product CRUD & Role Authorization ---');
    // Customer attempting admin POST -> 403
    const customerCreate = await request('POST', '/api/products', {
      name: 'Hacker Product',
      category: 'Electronics',
      price: 100,
      stock: 5
    }, customerCookie);
    assert(customerCreate.status === 403, 'Customer attempting POST /api/products receives 403 Forbidden');

    // Anonymous attempting admin POST -> 401
    const anonCreate = await request('POST', '/api/products', {
      name: 'Anon Product',
      category: 'Electronics',
      price: 100,
      stock: 5
    });
    assert(anonCreate.status === 401, 'Anonymous attempting POST /api/products receives 401 Unauthorized');

    // Validation error: negative price
    const negPrice = await request('POST', '/api/products', {
      name: 'Bad Product',
      category: 'Electronics',
      price: -50,
      stock: 5
    }, adminCookie);
    assert(negPrice.status === 400, 'POST /api/products with negative price returns 400 Bad Request');

    // Admin creating a valid product
    const adminCreate = await request('POST', '/api/products', {
      name: 'Mechanical Numpad',
      category: 'Electronics',
      price: 899,
      stock: 10,
      rating: 4.7
    }, adminCookie);
    assert(adminCreate.status === 201 && adminCreate.body.product.id.startsWith('prod_'), 'Admin POST /api/products creates product (201 Created)');
    const createdId = adminCreate.body.product.id;

    // Admin updating product
    const adminUpdate = await request('PUT', `/api/products/${createdId}`, {
      price: 799,
      stock: 15
    }, adminCookie);
    assert(adminUpdate.status === 200 && adminUpdate.body.product.price === 799 && adminUpdate.body.product.stock === 15, 'Admin PUT /api/products/:id updates price and stock');

    // Admin deleting product
    const adminDelete = await request('DELETE', `/api/products/${createdId}`, null, adminCookie);
    assert(adminDelete.status === 200, 'Admin DELETE /api/products/:id deletes product');

    // Verify deleted
    const verifyDel = await request('GET', `/api/products/${createdId}`);
    assert(verifyDel.status === 404, 'Deleted product returns 404 Not Found');

    // 5. Shopping Cart Operations & Stock Validation
    console.log('\n--- TEST GROUP 5: Shopping Cart & Inventory Validation ---');
    // Empty cart initially
    const initCart = await request('GET', '/api/cart', null, customerCookie);
    assert(initCart.status === 200 && initCart.body.cart.items.length === 0 && initCart.body.cart.cartTotal === 0, 'GET /api/cart returns empty cart with 0 total for new user');

    // Attempt checkout on empty cart -> 400
    const emptyCheckout = await request('POST', '/api/cart/checkout', null, customerCookie);
    assert(emptyCheckout.status === 400 && emptyCheckout.body.message === 'Cart is empty', 'Checkout on empty cart returns 400 "Cart is empty"');

    // Out of stock product test (prod_105 has stock: 0)
    const outOfStockAdd = await request('POST', '/api/cart/items', {
      productId: 'prod_105',
      quantity: 1
    }, customerCookie);
    assert(outOfStockAdd.status === 400 && outOfStockAdd.body.message === 'Out of stock', 'Adding product with stock 0 returns 400 "Out of stock"');

    // Insufficient stock test (prod_104 has stock: 3, requesting 5)
    const overStockAdd = await request('POST', '/api/cart/items', {
      productId: 'prod_104',
      quantity: 5
    }, customerCookie);
    assert(overStockAdd.status === 400 && overStockAdd.body.message.includes('Insufficient stock'), 'Adding quantity exceeding available stock returns 400 "Insufficient stock"');

    // Add valid item (prod_101, qty 2, price 2999)
    const add1 = await request('POST', '/api/cart/items', {
      productId: 'prod_101',
      quantity: 2
    }, customerCookie);
    assert(add1.status === 200 && add1.body.cart.items.length === 1 && add1.body.cart.cartTotal === 5998, 'Add item to cart computes itemTotal and cartTotal (2 x 2999 = 5998)');

    // Add same product again (prod_101, qty 1) -> merges quantities to 3
    const add2 = await request('POST', '/api/cart/items', {
      productId: 'prod_101',
      quantity: 1
    }, customerCookie);
    assert(add2.status === 200 && add2.body.cart.items[0].quantity === 3 && add2.body.cart.cartTotal === 8997, 'Adding same product merges quantity to 3 (3 x 2999 = 8997)');

    // Add second product (prod_104, qty 2, price 799)
    const add3 = await request('POST', '/api/cart/items', {
      productId: 'prod_104',
      quantity: 2
    }, customerCookie);
    assert(add3.status === 200 && add3.body.cart.items.length === 2 && add3.body.cart.cartTotal === 8997 + (2 * 799), 'Adding second product updates total cart amount');

    // Remove product not in cart -> 404
    const removeMissing = await request('DELETE', '/api/cart/items/prod_102', null, customerCookie);
    assert(removeMissing.status === 404, 'DELETE non-cart item returns 404 Not in Cart');

    // Remove prod_104 from cart -> 200
    const remove104 = await request('DELETE', '/api/cart/items/prod_104', null, customerCookie);
    assert(remove104.status === 200 && remove104.body.cart.items.length === 1 && remove104.body.cart.cartTotal === 8997, 'DELETE /api/cart/items/:productId removes item and recalculates total');

    // 6. Checkout & Inventory Decrement Verification
    console.log('\n--- TEST GROUP 6: Checkout Execution & Stock Decrement ---');
    // Check stock of prod_101 before checkout
    const prod101Before = await request('GET', '/api/products/prod_101');
    const stockBefore = prod101Before.body.product.stock;
    console.log(`  ℹ️  prod_101 stock before checkout: ${stockBefore} units`);

    // Perform checkout (cart has 3 units of prod_101)
    const checkoutRes = await request('POST', '/api/cart/checkout', null, customerCookie);
    assert(checkoutRes.status === 200 && checkoutRes.body.success === true, 'POST /api/cart/checkout succeeds (200 OK)');
    assert(checkoutRes.body.order.orderId.startsWith('ord_'), 'Order summary contains valid orderId');
    assert(checkoutRes.body.order.totalAmount === 8997, 'Order summary totalAmount matches items sum (₹8997)');

    // Check stock after checkout
    const prod101After = await request('GET', '/api/products/prod_101');
    const stockAfter = prod101After.body.product.stock;
    console.log(`  ℹ️  prod_101 stock after checkout: ${stockAfter} units (Decremented by 3: ${stockBefore} -> ${stockAfter})`);
    assert(stockAfter === stockBefore - 3, 'Inventory stock is accurately decremented in products.json');

    // Check cart is now empty
    const cartAfterCheckout = await request('GET', '/api/cart', null, customerCookie);
    assert(cartAfterCheckout.body.cart.items.length === 0 && cartAfterCheckout.body.cart.cartTotal === 0, 'Cart is cleared after successful checkout');

    // 7. Logout Test
    console.log('\n--- TEST GROUP 7: Session Logout ---');
    const logoutRes = await request('POST', '/api/auth/logout', null, customerCookie);
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');

    // Verify session terminated
    const cartAfterLogout = await request('GET', '/api/cart', null, customerCookie);
    assert(cartAfterLogout.status === 401, 'Accessing protected route after logout returns 401 Unauthorized');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)\n');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    // Reset seed data back to pristine state for grading & submission
    await resetCleanSeedState();
    if (server) {
      server.close();
    }
  }
}

runTests();
