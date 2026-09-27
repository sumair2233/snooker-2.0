const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Seeding initial data into Neon PostgreSQL...');

  const adminPinHash = bcrypt.hashSync('1234', 10);
  const empPinHash = bcrypt.hashSync('7860', 10);
  const zeeshanPinHash = bcrypt.hashSync('1122', 10);

  // 1. Users
  await sql.query(`
    INSERT INTO users (id, name, username, role, pin_hash, active) VALUES
    ('usr-admin-1', 'Club Manager (Admin)', 'admin', 'admin', $1, true),
    ('usr-emp-1', 'Hamza Staff (emp786)', 'emp786', 'employee', $2, true),
    ('usr-emp-2', 'Zeeshan Night Shift', 'zeeshan', 'employee', $3, true)
    ON CONFLICT (username) DO NOTHING;
  `, [adminPinHash, empPinHash, zeeshanPinHash]);
  console.log('[OK] Users seeded: admin (1234), emp786 (7860), zeeshan (1122)');

  // 2. Settings
  await sql.query(`
    INSERT INTO settings (id, club_name, phone, address, currency, table_count, century_rate_per_min, receipt_footer)
    VALUES (1, 'Green Baize Snooker Lounge', '+92 300 8472910', 'Plot 42, Commercial Sector Y, Phase 3 DHA, Lahore', 'Rs.', 6, 6, 'Green Baize Snooker Lounge • Champions Play Here')
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('[OK] Settings seeded');

  // 3. Tables (6 tables)
  const defaultRates = {
    single: { 15: 150, 10: 120, 6: 90 },
    double: { 15: 250, 10: 200, 6: 150 },
    century_per_min: 6,
    final: { 15: 350, 10: 280, 6: 220 }
  };

  const tables = [
    { id: 'table-1', num: 1, name: 'Table 1 — Shender Steel Block Pro', brand: 'Shender Match Standard' },
    { id: 'table-2', num: 2, name: 'Table 2 — Xingpai Star Tournament', brand: 'Xingpai Pro' },
    { id: 'table-3', num: 3, name: 'Table 3 — Riley Aristocrat Classic', brand: 'Riley England' },
    { id: 'table-4', num: 4, name: 'Table 4 — Shender Club Edition', brand: 'Shender Standard' },
    { id: 'table-5', num: 5, name: 'Table 5 — Wiraka M1 Tournament', brand: 'Wiraka Pro' },
    { id: 'table-6', num: 6, name: 'Table 6 — VIP Steel Cushion Enclosure', brand: 'Riley Grand Match Pro' }
  ];

  for (const t of tables) {
    await sql.query(`
      INSERT INTO tables (id, table_number, name, brand, rates, active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (id) DO NOTHING;
    `, [t.id, t.num, t.name, t.brand, JSON.stringify(defaultRates)]);
  }
  console.log('[OK] 6 Snooker tables seeded');

  // 4. Cafe items
  const cafeItems = [
    { id: 'cafe-1', name: 'Mineral Water (500ml)', category: 'Beverages', purchase_price: 40, sale_price: 70, stock: 45 },
    { id: 'cafe-2', name: 'Red Bull Energy Drink', category: 'Beverages', purchase_price: 260, sale_price: 380, stock: 24 },
    { id: 'cafe-3', name: 'Karak Chai (Doodh Patti)', category: 'Hot Drinks', purchase_price: 35, sale_price: 80, stock: 100 },
    { id: 'cafe-4', name: 'Green Tea (Kahwa)', category: 'Hot Drinks', purchase_price: 25, sale_price: 60, stock: 50 },
    { id: 'cafe-5', name: 'Club Sandwich & Fries', category: 'Snacks', purchase_price: 220, sale_price: 380, stock: 15 },
    { id: 'cafe-6', name: 'Crispy Fries Large', category: 'Snacks', purchase_price: 110, sale_price: 200, stock: 30 },
    { id: 'cafe-7', name: 'Dunhill Lights Cigarettes', category: 'Cigarettes', purchase_price: 450, sale_price: 520, stock: 18 },
    { id: 'cafe-8', name: 'Snooker Chalk (Master Green)', category: 'Accessories', purchase_price: 80, sale_price: 150, stock: 25 }
  ];

  for (const c of cafeItems) {
    await sql.query(`
      INSERT INTO cafe_items (id, name, category, purchase_price, sale_price, stock, active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (id) DO NOTHING;
    `, [c.id, c.name, c.category, c.purchase_price, c.sale_price, c.stock]);
  }
  console.log('[OK] Cafe inventory items seeded');

  console.log('\nSeeding completed successfully!');
}

seed().catch(console.error);
