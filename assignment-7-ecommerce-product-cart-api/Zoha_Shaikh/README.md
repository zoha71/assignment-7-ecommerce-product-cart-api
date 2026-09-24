# 🛒 E-Commerce Product Catalog & Shopping Cart REST API

A production-structured, asynchronous **E-Commerce Product Catalog & Shopping Cart REST API** built with **Node.js** and **Express.js**, persisting relational state in structured JSON files via Node's asynchronous `fs/promises` module without any external database engine.

---

## 🌟 Key Features

- **Asynchronous File-System Persistence**: Thread-safe, non-blocking asynchronous file I/O (`fs/promises`) with an exclusive promise-queue mutex preventing concurrent race conditions.
- **Dynamic Search, Filter & Sort Engine**:
  - Filter by category (case-insensitive exact match)
  - Price range filtering (`minPrice`, `maxPrice` inclusive validation)
  - Stock availability toggle (`inStock=true` / `false`)
  - Substring search on product name (case-insensitive)
  - Multi-attribute sorting (`price_asc`, `price_desc`, `rating_desc`, `newest`, `name_asc`)
- **Stateful Session Authentication**: Cookie-backed user sessions using `express-session` and one-way password hashing using `bcryptjs`.
- **Role-Based Access Control (RBAC)**: Route protection differentiating between unauthenticated visitors, authenticated `customer` users, and `admin` users.
- **Inventory & Cart Management**:
  - Live inventory validation preventing overselling
  - Automatic line-item merging for duplicate products
  - Real-time cart total recalculation
  - Atomic checkout with live stock decrement and automated cart clearance
- **Production-Ready Architecture**: Centralized logging middleware, strict payload validation, clean error handling, health check endpoint (`/health`), and Render deployment blueprint (`render.yaml`).

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js (`>=18.0.0`)
- **Framework**: Express.js (`^4.19.2`)
- **Session & Auth**: `express-session`, `bcryptjs`
- **Utilities**: `dotenv`, `uuid`
- **Development**: `nodemon`
- **Persistence**: Node.js `fs/promises` (JSON files in `./data`)

---

## 📁 Project Structure

```
Kartik_Wagh/
├── data/
│   ├── carts.json          # Shopping carts persistence
│   ├── products.json       # Product catalog with stock levels
│   └── users.json          # Seeded users with bcrypt password hashes
├── controllers/
│   ├── authController.js   # Registration, login, logout, profile
│   ├── cartController.js   # Cart management, stock validation, checkout
│   └── productController.js# Catalog filtering, search, sorting & admin CRUD
├── middleware/
│   ├── authGuard.js        # Session guard (authGuard) & admin check (requireAdmin)
│   ├── logger.js           # ISO timestamped HTTP request/response logger
│   └── validateProduct.js  # Schema & data type validators for product payloads
├── routes/
│   ├── authRoutes.js       # /api/auth routes
│   ├── cartRoutes.js       # /api/cart routes
│   └── productRoutes.js    # /api/products routes
├── utils/
│   └── fileHelper.js       # Safe fs/promises read/write with mutex lock serialization
├── scripts/
│   └── seedAdmin.js        # Admin & sample customer seeding script
├── test_api.js             # Automated end-to-end endpoint verification suite
├── .env.example            # Environment configuration template
├── .env                    # Local environment variables (git-ignored)
├── .gitignore              # Git ignore rules
├── package.json            # Project manifest, dependencies, and scripts
├── render.yaml             # Render infrastructure-as-code Blueprint
├── server.js               # Express application entrypoint
└── README.md               # Complete project documentation
```

---

## 🔑 Seeded Credentials

The database comes pre-seeded with an administrator account and a sample customer account:

| Role | Username | Email | Password |
|---|---|---|---|
| **Admin** | `admin` | `admin@shop.com` | `Admin@123` |
| **Customer** | `samplecustomer` | `customer@shop.com` | `customer123` |

> 💡 To re-seed or reset accounts at any time, run: `npm run seed`

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
Ensure **Node.js (v18+)** and **npm** are installed on your machine.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The local `.env` contains `PORT=3000`, `NODE_ENV=development`, and a secure `SESSION_SECRET`)*

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Production Server
```bash
npm start
```

### 6. Run Automated Test Suite
```bash
npm test
```

---

## 📡 API Endpoint Reference

### 🔐 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Request Body | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new customer | None | `{"username":"alex","email":"alex@shop.com","password":"password123"}` | `201 Created`, `400 Bad Request` |
| `POST` | `/api/auth/login` | Authenticate & create session cookie | None | `{"email":"alex@shop.com","password":"password123"}` | `200 OK`, `400 Bad Request`, `401 Unauthorized` |
| `POST` | `/api/auth/logout` | Terminate session & clear cookie | None | *None* | `200 OK` |
| `GET` | `/api/auth/me` | View current logged-in session user | Session | *None* | `200 OK`, `401 Unauthorized` |

---

### 📦 2. Product Catalog Endpoints (`/api/products`)

| Method | Endpoint | Query Parameters | Description | Auth Required | Status Codes |
|---|---|---|---|---|---|
| `GET` | `/api/products` | `category`, `minPrice`, `maxPrice`, `inStock`, `search`, `sort` | Filter, search & sort catalog | None | `200 OK`, `400 Bad Request` |
| `GET` | `/api/products/:id` | *None* | Fetch single product by ID | None | `200 OK`, `404 Not Found` |
| `POST` | `/api/products` | *None* | Add product to catalog | **Admin** | `201 Created`, `400`, `401`, `403` |
| `PUT` | `/api/products/:id` | *None* | Update price/stock/details | **Admin** | `200 OK`, `400`, `401`, `403`, `404` |
| `DELETE` | `/api/products/:id` | *None* | Remove product from store | **Admin** | `200 OK`, `401`, `403`, `404` |

#### Valid Sorting Options for `/api/products?sort=<value>`:
- `price_asc`: Sorts by price lowest to highest
- `price_desc`: Sorts by price highest to lowest
- `rating_desc`: Sorts by highest customer rating
- `newest`: Sorts by newest creation timestamp
- `name_asc`: Sorts alphabetically by name (A–Z)

---

### 🛒 3. Shopping Cart Endpoints (`/api/cart`)
*All cart endpoints require active session authentication (`authGuard` -> 401 if unauthenticated).*

| Method | Endpoint | Description | Request Body | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/cart` | View current user's cart with calculated total | *None* | `200 OK`, `401 Unauthorized` |
| `POST` | `/api/cart/items` | Add product or increment quantity (validates stock) | `{"productId":"prod_101","quantity":2}` | `200 OK`, `400 Bad Request`, `401`, `404` |
| `DELETE` | `/api/cart/items/:productId` | Remove specific product from cart | *None* | `200 OK`, `401`, `404 Not in Cart` |
| `POST` | `/api/cart/checkout` | Validate stock, decrement inventory & clear cart | *None* | `200 OK`, `400 Empty/Insufficient Stock`, `401` |

---

### 🩺 4. System & Health Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/` | API welcome message & endpoint directory | `200 OK` |
| `GET` | `/health` | Render health check monitoring | `200 OK` |

---

## 💻 Complete cURL Walkthrough

You can copy and execute this complete flow to test the entire lifecycle:

```bash
BASE="http://localhost:3000"

# 1. Health Check
curl -s $BASE/health

# 2. Register a new customer
curl -s -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alex","email":"alex@shop.com","password":"password123"}'

# 3. Log in and save session cookie to cookies.txt
curl -s -c cookies.txt -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@shop.com","password":"password123"}'

# 4. Search and filter products (Electronics under ₹4000, in stock, sorted by price ascending)
curl -s "$BASE/api/products?category=Electronics&maxPrice=4000&inStock=true&sort=price_asc"

# 5. View initial empty cart
curl -s -b cookies.txt $BASE/api/cart

# 6. Add 2 units of Wireless Headphones (prod_101) to cart
curl -s -b cookies.txt -X POST $BASE/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_101","quantity":2}'

# 7. Add 1 more unit of prod_101 (quantity merges to 3)
curl -s -b cookies.txt -X POST $BASE/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_101","quantity":1}'

# 8. Test Stock Validation: Attempt adding an item with stock 0 (prod_105) -> Expect 400 "Out of stock"
curl -s -b cookies.txt -X POST $BASE/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_105","quantity":1}'

# 9. Test Stock Validation: Attempt adding 50 units (exceeds inventory) -> Expect 400 "Insufficient stock"
curl -s -b cookies.txt -X POST $BASE/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_101","quantity":50}'

# 10. Perform Checkout -> Decrements stock in products.json & empties cart
curl -s -b cookies.txt -X POST $BASE/api/cart/checkout

# 11. Verify stock was decremented in product catalog
curl -s $BASE/api/products/prod_101

# 12. Verify cart is now empty
curl -s -b cookies.txt $BASE/api/cart

# 13. Log out and terminate session
curl -s -b cookies.txt -c cookies.txt -X POST $BASE/api/auth/logout

# 14. Access cart after logout -> Expect 401 Unauthorized
curl -s -b cookies.txt $BASE/api/cart
```

---

DEPLOYMENT LINK: 
https://assignment-7-ecommerce-product-cart-api-crkm.onrender.com/
