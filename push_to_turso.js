// push_to_turso.js - Push local schema and initial data to Turso Cloud
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('\n❌ ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables must be set.');
  console.log('Example:');
  console.log('  $env:TURSO_DATABASE_URL="libsql://your-db-name-org.turso.io"');
  console.log('  $env:TURSO_AUTH_TOKEN="your-token"');
  console.log('  node push_to_turso.js\n');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  console.log('Connecting to Turso:', url);
  
  // 1. Initialize schema
  const dbModule = require('./database');
  // Temporary point db to turso client
  dbModule.client = client;
  await dbModule.initSchema();

  // 2. Load dump
  const dumpPath = path.join(__dirname, 'extracted_raw', 'api_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.log('No api_dump.json found. Done.');
    return;
  }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  // Seed Users
  const userCount = (await client.execute('SELECT COUNT(*) as c FROM users')).rows[0].c;
  if (userCount === 0) {
    const users = dump['/api/users']?.data || [
      { id: 160, username: 'admindemo', full_name: 'Demo', role: 'admin', phone: '03123456789' },
      { id: 161, username: 'emp786', full_name: 'emp786', role: 'employee', phone: '' }
    ];
    for (const u of users) {
      await client.execute({
        sql: `INSERT INTO users (id, tenant_id, username, password, full_name, role, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [u.id, u.tenant_id || 72, u.username, u.username, u.full_name, u.role, u.phone || '']
      });
    }
    console.log(`Seeded ${users.length} users to Turso.`);
  }

  // Seed Tables
  const tableCount = (await client.execute('SELECT COUNT(*) as c FROM tables')).rows[0].c;
  if (tableCount === 0) {
    const tables = dump['/api/tables']?.data || [];
    for (const t of tables) {
      await client.execute({
        sql: `INSERT INTO tables (
          id, tenant_id, name, rate_game, rate_min, active, price_15ball, price_10ball, price_6ball, price_1ball,
          rate_hour, century_rate_type, rate_token, rate_30min, table_kind, game_modes, game_rate_types,
          icon, game_style, snooker_rate_min, snooker_rate_hour, extra_charges
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          t.id, t.tenant_id || 72, t.name, t.rate_game || 100, t.rate_min || 3, t.active !== undefined ? t.active : 1,
          t.price_15ball, t.price_10ball, t.price_6ball, t.price_1ball,
          t.rate_hour, t.century_rate_type || 'min', t.rate_token, t.rate_30min,
          t.table_kind || 'snooker',
          Array.isArray(t.game_modes) ? JSON.stringify(t.game_modes) : t.game_modes,
          Array.isArray(t.game_rate_types) ? JSON.stringify(t.game_rate_types) : t.game_rate_types,
          t.icon, t.game_style || 'controller',
          t.snooker_rate_min, t.snooker_rate_hour, t.extra_charges || 0
        ]
      });
    }
    console.log(`Seeded ${tables.length} tables to Turso.`);
  }

  // Seed Cafe Inventory
  const cafeCount = (await client.execute('SELECT COUNT(*) as c FROM cafe_inventory')).rows[0].c;
  if (cafeCount === 0) {
    const items = dump['/api/cafe/inventory']?.data || [];
    for (const it of items) {
      await client.execute({
        sql: `INSERT INTO cafe_inventory (id, tenant_id, name, price, cost_price, stock, unit, category, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [it.id, it.tenant_id || 72, it.name, it.price, it.cost_price || 0, it.stock || 0, it.unit || 'piece', it.category || 'Other', it.active !== undefined ? it.active : 1]
      });
    }
    console.log(`Seeded ${items.length} inventory items to Turso.`);
  }

  // Seed Settings
  const settingsCount = (await client.execute('SELECT COUNT(*) as c FROM settings')).rows[0].c;
  if (settingsCount === 0) {
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
      print_paper_size: '76mm'
    };
    for (const [k, v] of Object.entries(settings)) {
      await client.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]
      });
    }

    const sub = dump['/api/settings/subscription']?.data || {
      sub_type: 'yearly',
      sub_start: '2026-08-24',
      sub_end: '2027-09-23',
      trial_days: 7,
      active: 1,
      days_left: 340
    };
    await client.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      args: ['subscription', JSON.stringify(sub)]
    });
    console.log('Seeded settings to Turso.');
  }

  console.log('\n🎉 Successfully initialized and seeded Turso Cloud Database!');
}

run().catch(console.error);
