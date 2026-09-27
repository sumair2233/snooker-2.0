const fs = require('fs');
const path = require('path');
const { sql } = require('@vercel/postgres');

async function syncAll() {
  console.log('Syncing all data from snooker-db.json to Neon PostgreSQL...');
  const jsonPath = path.join(__dirname, '..', 'data', 'snooker-db.json');
  const db = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 1. Users
  if (db.users?.length) {
    for (const u of db.users) {
      await sql.query(`
        INSERT INTO users (id, name, username, role, pin_hash, active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          pin_hash = EXCLUDED.pin_hash,
          active = EXCLUDED.active;
      `, [u.id, u.name, u.username, u.role, u.pin_hash, u.active, u.created_at]);
    }
    console.log(`Synced ${db.users.length} users`);
  }

  // 2. Tables
  if (db.tables?.length) {
    for (const t of db.tables) {
      await sql.query(`
        INSERT INTO tables (id, table_number, name, brand, rates, active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          brand = EXCLUDED.brand,
          rates = EXCLUDED.rates,
          active = EXCLUDED.active;
      `, [t.id, t.table_number, t.name, t.brand, JSON.stringify(t.rates), t.active]);
    }
    console.log(`Synced ${db.tables.length} tables`);
  }

  // 3. Settings
  if (db.settings) {
    const s = db.settings;
    await sql.query(`
      INSERT INTO settings (id, club_name, phone, address, currency, table_count, century_rate_per_min, receipt_footer)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        club_name = EXCLUDED.club_name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        currency = EXCLUDED.currency,
        table_count = EXCLUDED.table_count,
        century_rate_per_min = EXCLUDED.century_rate_per_min,
        receipt_footer = EXCLUDED.receipt_footer;
    `, [s.club_name, s.phone, s.address, s.currency, s.table_count, s.century_rate_per_min, s.receipt_footer]);
    console.log('Synced settings');
  }

  // 4. Cafe Items
  if (db.cafeItems?.length) {
    for (const c of db.cafeItems) {
      await sql.query(`
        INSERT INTO cafe_items (id, name, category, purchase_price, sale_price, stock, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          purchase_price = EXCLUDED.purchase_price,
          sale_price = EXCLUDED.sale_price,
          stock = EXCLUDED.stock,
          active = EXCLUDED.active;
      `, [c.id, c.name, c.category, c.purchase_price, c.sale_price, c.stock, c.active]);
    }
    console.log(`Synced ${db.cafeItems.length} cafe items`);
  }

  // 5. Games
  if (db.games?.length) {
    for (const g of db.games) {
      await sql.query(`
        INSERT INTO games (id, table_id, table_name, type, ball_count, rate, players, loser, start_time, end_time, duration_minutes, status, payment_method, amount, cash_amount, online_amount, discount, employee_id, employee_name, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO NOTHING;
      `, [
        g.id, g.table_id, g.table_name, g.type, g.ball_count, g.rate,
        JSON.stringify(g.players), g.loser || null, g.start_time, g.end_time || null,
        g.duration_minutes || null, g.status, g.payment_method, g.amount,
        g.cash_amount, g.online_amount, g.discount, g.employee_id, g.employee_name,
        g.notes || null, g.created_at
      ]);
    }
    console.log(`Synced ${db.games.length} games`);
  }

  // 6. Player Bills
  if (db.playerBills?.length) {
    for (const b of db.playerBills) {
      await sql.query(`
        INSERT INTO player_bills (id, player_name, phone, game_ids, game_amount, cafe_amount, discount, paid, loan, balance, status, last_activity, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING;
      `, [
        b.id, b.player_name, b.phone || null, JSON.stringify(b.game_ids || []),
        b.game_amount, b.cafe_amount, b.discount, b.paid, b.loan, b.balance,
        b.status, b.last_activity, b.created_at, b.updated_at
      ]);
    }
    console.log(`Synced ${db.playerBills.length} player bills`);
  }

  // 7. Loans
  if (db.loans?.length) {
    for (const l of db.loans) {
      await sql.query(`
        INSERT INTO loans (id, customer_name, phone, amount, paid, remaining, date, reason, status, employee_id, employee_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING;
      `, [
        l.id, l.customer_name, l.phone || null, l.amount, l.paid, l.remaining,
        l.date, l.reason, l.status, l.employee_id, l.employee_name, l.created_at
      ]);
    }
    console.log(`Synced ${db.loans.length} loans`);
  }

  // 8. Expenses
  if (db.expenses?.length) {
    for (const e of db.expenses) {
      await sql.query(`
        INSERT INTO expenses (id, date, category, amount, note, employee_id, employee_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING;
      `, [e.id, e.date, e.category, e.amount, e.note, e.employee_id, e.employee_name, e.created_at]);
    }
    console.log(`Synced ${db.expenses.length} expenses`);
  }

  // 9. Revenue
  if (db.revenue?.length) {
    for (const r of db.revenue) {
      await sql.query(`
        INSERT INTO revenue_entries (id, date, category, amount, payment_method, note, employee_id, employee_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING;
      `, [r.id, r.date, r.category, r.amount, r.payment_method, r.note, r.employee_id, r.employee_name, r.created_at]);
    }
    console.log(`Synced ${db.revenue.length} revenue entries`);
  }

  // 10. Cafe Orders
  if (db.cafeOrders?.length) {
    for (const o of db.cafeOrders) {
      await sql.query(`
        INSERT INTO cafe_orders (id, player_name_or_walkin, is_walkin, items, total, discount, net_total, payment_method, status, date, employee_id, employee_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING;
      `, [
        o.id, o.player_name_or_walkin, o.is_walkin, JSON.stringify(o.items),
        o.total, o.discount, o.net_total, o.payment_method, o.status,
        o.date, o.employee_id, o.employee_name, o.created_at
      ]);
    }
    console.log(`Synced ${db.cafeOrders.length} cafe orders`);
  }

  // 11. Void Requests
  if (db.voidRequests?.length) {
    for (const v of db.voidRequests) {
      await sql.query(`
        INSERT INTO void_requests (id, game_id, table_name, amount, reason, requested_by_id, requested_by_name, status, reviewed_by_name, reviewed_at, admin_notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING;
      `, [
        v.id, v.game_id, v.table_name, v.amount, v.reason, v.requested_by_id,
        v.requested_by_name, v.status, v.reviewed_by_name || null,
        v.reviewed_at || null, v.admin_notes || null, v.created_at
      ]);
    }
    console.log(`Synced ${db.voidRequests.length} void requests`);
  }

  // 12. Audit Log
  if (db.auditLogs?.length) {
    for (const a of db.auditLogs) {
      await sql.query(`
        INSERT INTO audit_log (id, actor_id, actor_name, action, entity, entity_id, details, before, after, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [
        a.id, a.actor_id, a.actor_name, a.action, a.entity, a.entity_id,
        a.details, a.before ? JSON.stringify(a.before) : null,
        a.after ? JSON.stringify(a.after) : null, a.timestamp
      ]);
    }
    console.log(`Synced ${db.auditLogs.length} audit logs`);
  }

  console.log('\nAll data successfully synced to Neon PostgreSQL!');
}

syncAll().catch(console.error);
