const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function seedAdmin() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const adminUser = {
      id: `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
      username: 'admin',
      email: 'admin@shop.com',
      passwordHash: passwordHash,
      role: 'admin',
      createdAt: '2026-03-01T00:00:00.000Z'
    };

    const customerPasswordHash = await bcrypt.hash('customer123', 10);
    const customerUser = {
      id: `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
      username: 'samplecustomer',
      email: 'customer@shop.com',
      passwordHash: customerPasswordHash,
      role: 'customer',
      createdAt: '2026-03-01T00:00:00.000Z'
    };

    const users = [adminUser, customerUser];
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2) + '\n', 'utf-8');
    console.log('✅ Seeded users successfully in data/users.json');
    console.log('Admin account: admin@shop.com / Admin@123 (role: admin)');
    console.log('Customer account: customer@shop.com / customer123 (role: customer)');
  } catch (err) {
    console.error('❌ Failed to seed admin user:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
