// seed.js - Seed initial database state from api_dump.json
const db = require('./database');
const fs = require('fs');
const path = require('path');

function seed() {
  const dumpPath = path.join(__dirname, 'extracted_raw', 'api_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.log('No api_dump.json found, skipping seed.');
    return;
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  // 1. Seed Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding users...');
    const users = dump['/api/users']?.data || [
      { id: 160, username: 'admindemo', full_name: 'Demo', role: 'admin', phone: '03123456789' },
      { id: 161, username: 'emp786', full_name: 'emp786', role: 'employee', phone: '' }
    ];
    const insertUser = db.prepare(`
      INSERT INTO users (id, tenant_id, username, password, full_name, role, phone, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    users.forEach(u => {
      // Set default passwords matching username (admindemo / emp786)
      insertUser.run(u.id, u.tenant_id || 72, u.username, u.username, u.full_name, u.role, u.phone || '');
    });
    console.log(`Seeded ${users.length} users.`);
  }

  // 2. Seed Tables
  const tableCount = db.prepare('SELECT COUNT(*) as count FROM tables').get().count;
  if (tableCount === 0) {
    console.log('Seeding tables...');
    const tables = dump['/api/tables']?.data || [];
    const insertTable = db.prepare(`
      INSERT INTO tables (
        id, tenant_id, name, rate_game, rate_min, active,
        price_15ball, price_10ball, price_6ball, price_1ball,
        rate_hour, century_rate_type, rate_token, rate_30min,
        table_kind, game_modes, game_rate_types, icon, game_style,
        snooker_rate_min, snooker_rate_hour, extra_charges
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    tables.forEach(t => {
      insertTable.run(
        t.id, t.tenant_id || 72, t.name, t.rate_game || 100, t.rate_min || 3, t.active !== undefined ? t.active : 1,
        t.price_15ball, t.price_10ball, t.price_6ball, t.price_1ball,
        t.rate_hour, t.century_rate_type || 'min', t.rate_token, t.rate_30min,
        t.table_kind || 'snooker',
        Array.isArray(t.game_modes) ? JSON.stringify(t.game_modes) : t.game_modes,
        Array.isArray(t.game_rate_types) ? JSON.stringify(t.game_rate_types) : t.game_rate_types,
        t.icon, t.game_style || 'controller',
        t.snooker_rate_min, t.snooker_rate_hour, t.extra_charges || 0
      );
    });
    console.log(`Seeded ${tables.length} tables.`);
  }

  // 3. Seed Cafe Inventory
  const cafeCount = db.prepare('SELECT COUNT(*) as count FROM cafe_inventory').get().count;
  if (cafeCount === 0) {
    console.log('Seeding cafe inventory...');
    const items = dump['/api/cafe/inventory']?.data || [];
    const insertItem = db.prepare(`
      INSERT INTO cafe_inventory (id, tenant_id, name, price, cost_price, stock, unit, category, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach(it => {
      insertItem.run(
        it.id, it.tenant_id || 72, it.name, it.price, it.cost_price || 0, it.stock || 0,
        it.unit || 'piece', it.category || 'Other', it.active !== undefined ? it.active : 1
      );
    });
    console.log(`Seeded ${items.length} inventory items.`);
  }

  // 4. Seed Settings
  const settingCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingCount === 0) {
    console.log('Seeding settings...');
    const settings = dump['/api/settings']?.data || {
      club_name: '3D Snooker Club',
      currency: 'Rs.',
      default_rate: '50',
      century_rate_min: '10',
      logo: 'logo-1787837392099-233740338.jpeg',
      show_club_name: true,
      club_kind: 'snooker',
      has_snooker: true,
      has_games: false,
      game_modes: ['single_player', '1v1', '2v2'],
      game_rate_types: ['game'],
      cancel_game_button: true,
      print_paper_size: '76mm',
      esp32_ip: '192.168.100.184',
      esp32_url: 'http://192.168.100.184'
    };
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      insertSetting.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }

    const sub = dump['/api/settings/subscription']?.data || {
      sub_type: 'yearly',
      sub_start: '2026-08-24',
      sub_end: '2027-09-23',
      trial_days: 7,
      trial_start: null,
      active: 1,
      days_left: 340
    };
    insertSetting.run('subscription', JSON.stringify(sub));
    console.log('Seeded settings and subscription.');
  }

  // 5. Seed sample expenses if none
  const expCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get().count;
  if (expCount === 0) {
    console.log('Seeding expenses...');
    const exps = dump['/api/expenses']?.data || [];
    const insertExp = db.prepare(`
      INSERT INTO expenses (id, tenant_id, date, category, description, amount, employee_id, source, employee_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    exps.forEach(e => {
      insertExp.run(e.id, e.tenant_id || 72, e.date, e.category, e.description, e.amount, e.employee_id, e.source, e.employee_name, e.created_at);
    });
    console.log(`Seeded ${exps.length} expenses.`);
  }

  // 6. Seed cafe orders if none
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM cafe_orders').get().count;
  if (orderCount === 0) {
    console.log('Seeding cafe orders...');
    const orders = dump['/api/cafe/orders']?.data || [];
    const insertOrder = db.prepare(`
      INSERT INTO cafe_orders (
        id, tenant_id, table_id, game_id, player_name, phone, date, total, status,
        employee_id, payment_method, paid_cash, paid_online, board_cash_base,
        board_online_base, paid_plus, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO cafe_order_items (order_id, item_id, item_name, qty, unit_price, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    orders.forEach(o => {
      insertOrder.run(
        o.id, o.tenant_id || 72, o.table_id, o.game_id, o.player_name, o.phone, o.date, o.total,
        o.status, o.employee_id, o.payment_method, o.paid_cash || 0, o.paid_online || 0,
        o.board_cash_base || 0, o.board_online_base || 0, o.paid_plus || 0, o.created_at
      );
      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          insertItem.run(o.id, it.item_id, it.item_name, it.qty, it.unit_price, it.total);
        });
      }
    });
    console.log(`Seeded ${orders.length} cafe orders.`);
  }
}

seed();
