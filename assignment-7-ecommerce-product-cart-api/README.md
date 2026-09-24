# 🛒 Assignment 07: E-Commerce Product & Shopping Cart API
> **Track:** Backend Development | **Level:** Beginner to Intermediate | **Estimated Time:** 5–7 Hours  
> **Tech Stack:** Node.js, Express.js, JSON / File-System Data Storage (`fs/promises`), bcryptjs, Express-Session

---

## 📌 1. Objective & Overview

Build a lightweight, production-structured **E-Commerce Product Catalog & Shopping Cart REST API** using **Node.js** and **Express.js**, persisting data directly in structured JSON files via Node's asynchronous file system module (`fs/promises`). This assignment reinforces core backend fundamentals: multi-criteria filtering, cart calculations (totals, discounts, stock validation), user session management, and custom middleware design without relying on a full database engine.

### Key Learning Outcomes:
- Asynchronous file I/O operations using Node's `fs/promises` (`readFile`, `writeFile`).
- Building dynamic search and filtering engines (Category, Price Range, In-Stock, Sorting).
- Managing stateful shopping cart sessions tied to authenticated users.
- Implementing inventory reservation checks before items are added to a cart.
- Designing reusable validation and logging middleware.

---

## 🛠️ 2. Tech Stack & Dependencies

```bash
# Initialize Node.js project
npm init -y

# Install runtime dependencies
npm install express bcryptjs express-session dotenv uuid

# Install development dependencies
npm install -D nodemon
```

---

## 🗄️ 3. JSON Data Schemas & Entities

Data will be persisted in `./data/products.json`, `./data/users.json`, and `./data/carts.json`.

### 📦 Product Entity (`data/products.json`)
```json
[
  {
    "id": "prod_101",
    "name": "Wireless Noise-Canceling Headphones",
    "category": "Electronics",
    "price": 2999,
    "stock": 15,
    "rating": 4.6,
    "createdAt": "2026-03-01T10:00:00.000Z"
  }
]
```

### 🛍️ Cart Entity (`data/carts.json`)
```json
[
  {
    "userId": "usr_001",
    "items": [
      {
        "productId": "prod_101",
        "name": "Wireless Noise-Canceling Headphones",
        "unitPrice": 2999,
        "quantity": 2,
        "itemTotal": 5998
      }
    ],
    "cartTotal": 5998,
    "updatedAt": "2026-03-01T11:30:00.000Z"
  }
]
```

---

## 📋 4. API Endpoints Specification

### 🔐 User Authentication

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register customer with hashed password | `{"username":"alex","email":"alex@shop.com","password":"password123"}` | `201 Created`<br>`400 Bad Request` |
| `POST` | `/api/auth/login` | Authenticate customer and create session | `{"email":"alex@shop.com","password":"password123"}` | `200 OK`<br>`401 Unauthorized` |
| `POST` | `/api/auth/logout` | Terminate session | None | `200 OK` |

### 📦 Product Catalog Management

| Method | Endpoint | Query Parameters | Description | Request Body Example | Status Codes |
|---|---|---|---|---|---|
| `GET` | `/api/products` | `?category=Electronics&minPrice=1000&maxPrice=5000&sort=price_asc` | Filter & search products | None | `200 OK` |
| `GET` | `/api/products/:id` | None | Fetch single product by ID | None | `200 OK`<br>`404 Not Found` |
| `POST` | `/api/products` | None | Add a new product (Admin route) | `{"name":"Mechanical Keyboard","category":"Electronics","price":1899,"stock":25,"rating":4.5}` | `201 Created`<br>`400 Bad Request` |
| `PUT` | `/api/products/:id` | None | Update price or stock count | `{"stock":30,"price":1799}` | `200 OK`<br>`404 Not Found` |
| `DELETE` | `/api/products/:id` | None | Remove product from store | None | `200 OK`<br>`404 Not Found` |

### 🛒 Shopping Cart System (Authenticated)

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/cart` | View current user's cart with calculated total | None | `200 OK` |
| `POST` | `/api/cart/items` | Add product to cart (Validates stock availability) | `{"productId":"prod_101","quantity":1}` | `200 OK`<br>`400 Out of Stock` |
| `DELETE` | `/api/cart/items/:productId` | Remove specific product from cart | None | `200 OK`<br>`404 Not in Cart` |
| `POST` | `/api/cart/checkout` | Simulate order placement & decrement product stock | None | `200 OK`<br>`400 Empty Cart` |

---

## 🏗️ 5. Project Folder Architecture

```text
assignment-07-ecommerce-api/
├── data/
│   ├── carts.json
│   ├── products.json
│   └── users.json
├── controllers/
│   ├── authController.js
│   ├── cartController.js
│   └── productController.js
├── middleware/
│   ├── authGuard.js         # Check req.session.user exists
│   ├── logger.js            # Request logger
│   └── validateProduct.js   # Verify price > 0, stock >= 0
├── routes/
│   ├── authRoutes.js
│   ├── cartRoutes.js
│   └── productRoutes.js
├── utils/
│   └── fileHelper.js        # readJSONFile, writeJSONFile wrappers
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## ⚙️ 6. Core Implementation Guide: Asynchronous File Helper

```javascript
// utils/fileHelper.js
const fs = require('fs/promises');
const path = require('path');

const readData = async (filename) => {
  const filePath = path.join(__dirname, '../data', filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeData = async (filename, data) => {
  const filePath = path.join(__dirname, '../data', filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

module.exports = { readData, writeData };
```

---

## 🧪 7. Testing & Verification

1. Seed `data/products.json` with 5 products across different categories.
2. Register and log in a user.
3. Test adding an item with quantity higher than available stock; ensure the API responds with `400 Bad Request: Insufficient stock`.
4. Test the checkout endpoint: verify that product stock in `products.json` decrements automatically upon successful checkout.

---

## 📊 8. Grading Rubric (100 Marks)

| Evaluation Component | Marks |
|---|:---:|
| **File-System Async Data Persistence (`fs/promises`)** | 25 |
| **Product Filtering, Search & Sorting Logic** | 20 |
| **Shopping Cart Management & Stock Validation** | 25 |
| **Session Authentication & Password Hashing** | 15 |
| **Architecture, Error Handling & Code Quality** | 15 |
| **Total Marks** | **100** |

---

## 📤 9. Submission Guidelines

- Submit your GitHub repository: `itm-assignment-07-ecommerce-api`.
- Ensure the `data/` directory contains sample JSON data ready to test.
