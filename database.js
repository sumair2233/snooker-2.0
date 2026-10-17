// database.js - Universal Database Adapter for Local SQLite and Turso Cloud
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isVercel = !!process.env.VERCEL;
const isTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let client;
if (isTurso) {
  console.log('⚡ Connecting to Turso Cloud SQLite:', process.env.TURSO_DATABASE_URL);
  client = createClient({
    url: process.env.TURSO_DATABASE_URL.trim(),
    authToken: process.env.TURSO_AUTH_TOKEN.trim()
  });
} else {
  // Safe directory fallback: use os.tmpdir() on Vercel to prevent EROFS read-only filesystem crash
  const dataDir = isVercel ? os.tmpdir() : path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
  }
  const dbPath = path.resolve(dataDir, 'cuezone.db').replace(/\\/g, '/');
  console.log('💾 Connecting to local SQLite:', dbPath);
  client = createClient({
    url: 'file:' + dbPath
  });
}

function sanitizeArgs(args = []) {
  return args.map(a => a === undefined ? null : a);
}

let initPromise = null;
async function ensureReady() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await db.initSchema();

        // Auto-seed default users if table is empty
        const userCount = await client.execute('SELECT COUNT(*) as c FROM users').catch(() => null);
        if (!userCount || userCount.rows[0].c === 0) {
          console.log('Auto-seeding default admin and employee...');
          await client.execute({
            sql: `INSERT OR IGNORE INTO users (id, tenant_id, username, password, full_name, role, phone, active)
                  VALUES (160, 72, 'admindemo', 'admindemo', 'Demo', 'admin', '03123456789', 1),
                         (161, 72, 'emp786', 'emp786', 'emp786', 'employee', '', 1)`,
            args: []
          });
        }

        // Auto-seed default tables if table is empty
        const tableCount = await client.execute('SELECT COUNT(*) as c FROM tables').catch(() => null);
        if (!tableCount || tableCount.rows[0].c === 0) {
          console.log('Auto-seeding default tables...');
          const defaultTables = [
            [580, 'PS5 1', 350, 30, 'controller'],
            [582, 'Table 3', 200, 3, 'controller'],
            [583, 'Table 4', 200, 3, 'controller'],
            [584, 'Table 5', 200, 3, 'controller'],
            [585, 'Table 6', 200, 3, 'controller']
          ];
          for (const [id, name, rg, rm, gs] of defaultTables) {
            await client.execute({
              sql: `INSERT OR IGNORE INTO tables (id, tenant_id, name, rate_game, rate_min, active, game_style, table_kind)
                    VALUES (?, 72, ?, ?, ?, 1, ?, 'snooker')`,
              args: [id, name, rg, rm, gs]
            });
          }
        }

        // Auto-seed default settings if empty
        const settingCount = await client.execute('SELECT COUNT(*) as c FROM settings').catch(() => null);
        if (!settingCount || settingCount.rows[0].c === 0) {
          await client.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('club_name', '3D Snooker Club')", args: [] });
          await client.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'Rs.')", args: [] });
          await client.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('show_club_name', 'true')", args: [] });
          await client.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('subscription', '{\"sub_type\":\"yearly\",\"active\":1,\"days_left\":340}')", args: [] });
        }
      } catch (err) {
        console.error('Error during auto-initialization:', err);
      }
    })();
  }
  return initPromise;
}

const db = {
  client,
  isTurso,

  // Return array of objects
  async query(sql, args = []) {
    await ensureReady();
    const res = await client.execute({ sql, args: sanitizeArgs(args) });
    return res.rows;
  },

  // Return single object or null
  async queryOne(sql, args = []) {
    await ensureReady();
    const res = await client.execute({ sql, args: sanitizeArgs(args) });
    return res.rows[0] || null;
  },

  // Execute insert/update/delete
  async execute(sql, args = []) {
    await ensureReady();
    const res = await client.execute({ sql, args: sanitizeArgs(args) });
    return {
      rowsAffected: res.rowsAffected,
      lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : null
    };
  },

  // Execute batch statements in transaction
  async batch(statements) {
    await ensureReady();
    return await client.batch(statements);
  },

  // Schema creation
  async initSchema() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        name TEXT NOT NULL,
        rate_game REAL DEFAULT 100,
        rate_min REAL DEFAULT 3,
        active INTEGER DEFAULT 1,
        price_15ball REAL DEFAULT NULL,
        price_10ball REAL DEFAULT NULL,
        price_6ball REAL DEFAULT NULL,
        price_1ball REAL DEFAULT NULL,
        rate_hour REAL DEFAULT NULL,
        century_rate_type TEXT DEFAULT 'min',
        rate_token REAL DEFAULT NULL,
        rate_30min REAL DEFAULT NULL,
        table_kind TEXT DEFAULT 'snooker',
        game_modes TEXT DEFAULT NULL,
        game_rate_types TEXT DEFAULT NULL,
        icon TEXT DEFAULT NULL,
        game_style TEXT DEFAULT 'controller',
        snooker_rate_min REAL DEFAULT NULL,
        snooker_rate_hour REAL DEFAULT NULL,
        extra_charges REAL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        table_id INTEGER,
        game_type TEXT NOT NULL DEFAULT 'single',
        rate_type TEXT DEFAULT 'min',
        ball_type TEXT DEFAULT NULL,
        player1 TEXT DEFAULT '',
        player2 TEXT DEFAULT '',
        player3 TEXT DEFAULT '',
        player4 TEXT DEFAULT '',
        team1 TEXT DEFAULT '',
        team2 TEXT DEFAULT '',
        winner TEXT DEFAULT NULL,
        loser TEXT DEFAULT NULL,
        amount REAL DEFAULT 0,
        extra_charges REAL DEFAULT 0,
        start_time TEXT NOT NULL,
        start_date TEXT DEFAULT NULL,
        end_time TEXT DEFAULT NULL,
        duration INTEGER DEFAULT 0,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cash',
        paid_cash REAL DEFAULT 0,
        paid_online REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        loan_amount REAL DEFAULT 0,
        loan_phone TEXT DEFAULT NULL,
        bill_id INTEGER DEFAULT NULL,
        employee_id INTEGER,
        employee_name TEXT DEFAULT '',
        table_name TEXT DEFAULT '',
        void_reason TEXT DEFAULT NULL,
        void_requested_by TEXT DEFAULT NULL,
        void_requested_at TEXT DEFAULT NULL,
        void_status TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        bill_no TEXT DEFAULT '',
        player_name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        date TEXT NOT NULL,
        total_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        plus_amount REAL DEFAULT 0,
        plus_used REAL DEFAULT 0,
        cash_amount REAL DEFAULT 0,
        online_amount REAL DEFAULT 0,
        loan_amount REAL DEFAULT 0,
        online_method TEXT DEFAULT 'online',
        status TEXT DEFAULT 'pending',
        employee_id INTEGER,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        checkout_at TEXT DEFAULT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS cafe_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        unit TEXT DEFAULT 'piece',
        category TEXT DEFAULT 'Other',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS cafe_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        table_id INTEGER DEFAULT NULL,
        table_name TEXT DEFAULT NULL,
        game_id INTEGER DEFAULT NULL,
        bill_id INTEGER DEFAULT NULL,
        player_name TEXT DEFAULT NULL,
        phone TEXT DEFAULT NULL,
        date TEXT NOT NULL,
        total REAL DEFAULT 0,
        status TEXT DEFAULT 'paid',
        employee_id INTEGER DEFAULT NULL,
        payment_method TEXT DEFAULT 'cash',
        paid_cash REAL DEFAULT 0,
        paid_online REAL DEFAULT 0,
        board_cash_base REAL DEFAULT 0,
        board_online_base REAL DEFAULT 0,
        paid_plus REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS cafe_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        amount REAL NOT NULL,
        employee_id INTEGER DEFAULT NULL,
        source TEXT DEFAULT 'employee',
        employee_name TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        customer_name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'unpaid',
        bill_id INTEGER DEFAULT NULL,
        game_id INTEGER DEFAULT NULL,
        order_id INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS loan_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        loan_id INTEGER,
        customer_name TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        employee_id INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS board_clears (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        cleared_at TEXT DEFAULT (datetime('now','localtime')),
        cash_sale REAL DEFAULT 0,
        online_sale REAL DEFAULT 0,
        total_sale REAL DEFAULT 0,
        employee_id INTEGER DEFAULT NULL,
        employee_name TEXT DEFAULT '',
        notes TEXT DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER DEFAULT 72,
        user_id INTEGER,
        user_name TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`
    ];

    for (const sql of statements) {
      await client.execute(sql);
    }
    console.log('Database schema initialized.');
  }
};

module.exports = db;
