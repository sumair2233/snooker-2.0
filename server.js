// server.js - Universal CueZone Server (Vercel Serverless + Local Standalone)
const express = require('express');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Cookie session: stateless, survives all Vercel serverless function recycles
app.use(cookieSession({
  name: 'connect.sid',
  keys: [process.env.SESSION_SECRET || 'cuezone_snooker_secret_key_2026', 'cuezone_backup_key_2026'],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: 'lax'
}));

// Static assets (handled by Express locally, and by Vercel CDN in production)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/dowloads', express.static(path.join(__dirname, 'public')));

// Date & Time Helpers (defaulting to club timezone Asia/Karachi to avoid UTC serverless skew)
function todayStr(tz = 'Asia/Karachi') {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
}
function nowTime(tz = 'Asia/Karachi') {
  try {
    return new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  } catch {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }
}
function nowDateTime(tz = 'Asia/Karachi') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const m = {};
    parts.forEach(p => { m[p.type] = p.value; });
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`;
  } catch {
    const n = new Date();
    const p = v => String(v).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
  }
}

// Auth Middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized', redirect: '/' });
    }
    return res.redirect('/');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.redirect(req.session?.user ? '/employee' : '/');
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML VIEW ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/employee');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/employee', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'employee.html'));
});

app.get('/demo-videos', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Demo Videos — CueZone</title>
  <style>body{background:#0c1f15;color:#efe8d8;font-family:sans-serif;padding:3rem;text-align:center;}
  a{color:#d4a94e;text-decoration:none;font-size:1.1rem;display:inline-block;margin-top:2rem;}
  .card{background:#123524;border:1px solid rgba(212,169,78,.3);border-radius:12px;padding:2rem;max-width:600px;margin:2rem auto;}
  </style></head><body>
  <h1>🎬 CueZone Tutorial & Demo Videos</h1>
  <div class="card">
    <p>Watch step-by-step guides on how to manage snooker tables, start games, print customer receipts, handle cafe inventory, and track player khata loans.</p>
    <a href="/employee">← Back to Dashboard</a>
  </div>
  </body></html>`);
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Username and password are required' });
    }

    const u = await db.queryOne('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND active = 1', [username.trim()]);
    if (!u || u.password !== password) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    if (role && role !== u.role && u.role !== 'admin') {
      return res.status(401).json({ ok: false, error: `Account does not have ${role} privileges` });
    }

    const effectiveRole = (role === 'employee' && u.role === 'admin') ? 'employee' : u.role;

    req.session.user = {
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      role: effectiveRole,
      tenant_id: u.tenant_id || 72
    };

    res.json({
      ok: true,
      role: effectiveRole,
      name: u.full_name,
      days_left: 340
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    ok: true,
    role: req.session.user.role,
    user: req.session.user
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.post('/api/auth/verify-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await db.queryOne('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
    if (user && user.password === password) {
      return res.json({ ok: true });
    }
    res.json({ ok: false, error: 'Incorrect password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS & SUBSCRIPTION API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value === 'true' ? true : r.value === 'false' ? false : r.value;
      }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
  try {
    for (const [key, val] of Object.entries(req.body)) {
      await db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        key, typeof val === 'object' ? JSON.stringify(val) : String(val)
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/subscription', async (req, res) => {
  try {
    const subRow = await db.queryOne("SELECT value FROM settings WHERE key = 'subscription'");
    if (subRow) {
      try { return res.json(JSON.parse(subRow.value)); } catch {}
    }
    res.json({
      sub_type: 'yearly',
      sub_start: '2026-08-24',
      sub_end: '2027-09-23',
      trial_days: 7,
      trial_start: null,
      active: 1,
      days_left: 340
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/esp32/status', (req, res) => {
  res.json({
    connected: true,
    ssid: 'Royal Snooker Club',
    ip: '192.168.100.184',
    rssi: -71,
    hotspotOn: true,
    reportedAt: new Date().toISOString()
  });
});

app.post('/api/settings/esp32/wifi', requireAdmin, (req, res) => { res.json({ ok: true }); });
app.post('/api/settings/esp32/wifi/reset', requireAdmin, (req, res) => { res.json({ ok: true }); });

// ─────────────────────────────────────────────────────────────────────────────
// TABLES API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/tables', async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === '1';
    const query = includeInactive ? 'SELECT * FROM tables' : 'SELECT * FROM tables WHERE active = 1';
    const tables = await db.query(query);

    for (const t of tables) {
      try { if (t.game_modes) t.game_modes = JSON.parse(t.game_modes); } catch {}
      try { if (t.game_rate_types) t.game_rate_types = JSON.parse(t.game_rate_types); } catch {}
      t.active_game = await db.queryOne("SELECT * FROM games WHERE table_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1", [t.id]);
    }

    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const sql = `
      INSERT INTO tables (
        name, rate_game, rate_min, active, price_15ball, price_10ball, price_6ball, price_1ball,
        rate_hour, century_rate_type, rate_token, rate_30min, table_kind, game_modes, game_rate_types,
        game_style, snooker_rate_min, snooker_rate_hour, extra_charges
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.execute(sql, [
      b.name, Number(b.rate_game || 100), Number(b.rate_min || 3), b.active !== undefined ? b.active : 1,
      b.price_15ball, b.price_10ball, b.price_6ball, b.price_1ball,
      b.rate_hour, b.century_rate_type || 'min', b.rate_token, b.rate_30min,
      b.table_kind || 'snooker',
      Array.isArray(b.game_modes) ? JSON.stringify(b.game_modes) : b.game_modes,
      Array.isArray(b.game_rate_types) ? JSON.stringify(b.game_rate_types) : b.game_rate_types,
      b.game_style || 'controller',
      b.snooker_rate_min, b.snooker_rate_hour, Number(b.extra_charges || 0)
    ]);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tables/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const id = req.params.id;
    const existing = await db.queryOne('SELECT * FROM tables WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Table not found' });

    const sql = `
      UPDATE tables SET
        name = COALESCE(?, name),
        rate_game = COALESCE(?, rate_game),
        rate_min = COALESCE(?, rate_min),
        active = COALESCE(?, active),
        price_15ball = COALESCE(?, price_15ball),
        price_10ball = COALESCE(?, price_10ball),
        price_6ball = COALESCE(?, price_6ball),
        price_1ball = COALESCE(?, price_1ball),
        rate_hour = COALESCE(?, rate_hour),
        century_rate_type = COALESCE(?, century_rate_type),
        rate_token = COALESCE(?, rate_token),
        rate_30min = COALESCE(?, rate_30min),
        table_kind = COALESCE(?, table_kind),
        game_modes = COALESCE(?, game_modes),
        game_rate_types = COALESCE(?, game_rate_types),
        game_style = COALESCE(?, game_style),
        snooker_rate_min = COALESCE(?, snooker_rate_min),
        snooker_rate_hour = COALESCE(?, snooker_rate_hour),
        extra_charges = COALESCE(?, extra_charges)
      WHERE id = ?
    `;

    await db.execute(sql, [
      b.name, b.rate_game !== undefined ? Number(b.rate_game) : null,
      b.rate_min !== undefined ? Number(b.rate_min) : null,
      b.active !== undefined ? Number(b.active) : null,
      b.price_15ball !== undefined ? Number(b.price_15ball) : null,
      b.price_10ball !== undefined ? Number(b.price_10ball) : null,
      b.price_6ball !== undefined ? Number(b.price_6ball) : null,
      b.price_1ball !== undefined ? Number(b.price_1ball) : null,
      b.rate_hour !== undefined ? Number(b.rate_hour) : null,
      b.century_rate_type,
      b.rate_token !== undefined ? Number(b.rate_token) : null,
      b.rate_30min !== undefined ? Number(b.rate_30min) : null,
      b.table_kind,
      Array.isArray(b.game_modes) ? JSON.stringify(b.game_modes) : b.game_modes,
      Array.isArray(b.game_rate_types) ? JSON.stringify(b.game_rate_types) : b.game_rate_types,
      b.game_style,
      b.snooker_rate_min !== undefined ? Number(b.snooker_rate_min) : null,
      b.snooker_rate_hour !== undefined ? Number(b.snooker_rate_hour) : null,
      b.extra_charges !== undefined ? Number(b.extra_charges) : null,
      id
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tables/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE tables SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GAMES API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/games/active', async (req, res) => {
  try {
    const games = await db.query(`
      SELECT g.*, t.name as table_name, t.rate_game, t.rate_min, t.rate_hour, t.table_kind, t.game_style
      FROM games g
      LEFT JOIN tables t ON g.table_id = t.id
      WHERE g.status = 'active'
      ORDER BY g.id DESC
    `);
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/start', requireAuth, async (req, res) => {
  try {
    const b = req.body;
    const table = await db.queryOne('SELECT * FROM tables WHERE id = ?', [b.table_id]);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    // Cancel existing active game
    await db.execute("UPDATE games SET status = 'cancelled' WHERE table_id = ? AND status = 'active'", [b.table_id]);

    const sTime = b.start_time || nowTime();
    const sDate = b.date || b.start_date || todayStr();
    const empId = req.session.user?.id || 161;
    const empName = req.session.user?.full_name || 'emp786';

    const insert = `
      INSERT INTO games (
        table_id, game_type, rate_type, ball_type, player1, player2, player3, player4,
        team1, team2, extra_charges, start_time, start_date, date, status, employee_id,
        employee_name, table_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `;

    const result = await db.execute(insert, [
      b.table_id, b.game_type || 'single', b.rate_type || 'game', b.ball_type || null,
      b.player1 || '', b.player2 || '', b.player3 || '', b.player4 || '',
      b.team1 || '', b.team2 || '', Number(b.extra_charges || table.extra_charges || 0),
      sTime, sDate, sDate, empId, empName, table.name
    ]);

    const game = await db.queryOne('SELECT * FROM games WHERE id = ?', [result.lastInsertRowid]);
    res.json({ ok: true, game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/games/:id/end', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;
    const game = await db.queryOne('SELECT * FROM games WHERE id = ?', [id]);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const endT = b.end_time || nowTime();
    const dur = Number(b.duration || 0);
    const amt = Number(b.amount || 0);
    const extra = Number(b.extra_charges || game.extra_charges || 0);
    const totalAmt = amt + extra;

    const paymentStatus = b.payment_status || (b.payment_method === 'loan' ? 'loan' : 'paid');
    const paymentMethod = b.payment_method || 'cash';
    const paidCash = Number(b.paid_cash || 0);
    const paidOnline = Number(b.paid_online || 0);
    const loanAmt = Number(b.loan_amount || (paymentStatus === 'loan' ? totalAmt : 0));
    const loanPhone = b.loan_phone || '';

    await db.execute(`
      UPDATE games SET
        status = 'completed',
        winner = ?,
        loser = ?,
        end_time = ?,
        duration = ?,
        amount = ?,
        extra_charges = ?,
        payment_status = ?,
        payment_method = ?,
        paid_cash = ?,
        paid_online = ?,
        paid_amount = ?,
        loan_amount = ?,
        loan_phone = ?
      WHERE id = ?
    `, [
      b.winner || null, b.loser || null, endT, dur, totalAmt, extra,
      paymentStatus, paymentMethod, paidCash, paidOnline,
      paidCash + paidOnline, loanAmt, loanPhone, id
    ]);

    if (loanAmt > 0 && b.loser) {
      await db.execute(`
        INSERT INTO loans (customer_name, phone, amount, paid_amount, status, game_id)
        VALUES (?, ?, ?, 0, 'unpaid', ?)
      `, [b.loser, loanPhone, loanAmt, id]);
    }

    if (Array.isArray(b.cafe_orders) && b.cafe_orders.length > 0) {
      for (const co of b.cafe_orders) {
        await db.execute('UPDATE cafe_orders SET game_id = ?, status = ? WHERE id = ?', [id, paymentStatus, co.id]);
      }
    }

    const updated = await db.queryOne('SELECT * FROM games WHERE id = ?', [id]);
    res.json({ ok: true, game: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/:id/cancel', requireAuth, async (req, res) => {
  try {
    await db.execute("UPDATE games SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/:id/void-request', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    await db.execute(`
      UPDATE games SET
        void_status = 'pending',
        void_reason = ?,
        void_requested_by = ?,
        void_requested_at = datetime('now','localtime')
      WHERE id = ?
    `, [reason || 'Employee requested void', req.session.user?.username || 'emp786', req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/:id/void', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    await db.execute(`
      UPDATE games SET
        status = 'void',
        void_status = 'approved',
        void_reason = ?
      WHERE id = ?
    `, [reason || 'Admin voided game', req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/void/pending', requireAdmin, async (req, res) => {
  try {
    const pending = await db.query(`
      SELECT g.*, t.name as table_name
      FROM games g
      LEFT JOIN tables t ON g.table_id = t.id
      WHERE g.void_status = 'pending'
      ORDER BY g.id DESC
    `);
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    let sql = `
      SELECT g.*, t.name as table_name, t.table_kind, t.game_style
      FROM games g
      LEFT JOIN tables t ON g.table_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (req.query.date) {
      sql += ' AND g.date = ?';
      params.push(req.query.date);
    }
    if (req.query.table_id) {
      sql += ' AND g.table_id = ?';
      params.push(req.query.table_id);
    }
    if (req.query.status) {
      sql += ' AND g.status = ?';
      params.push(req.query.status);
    }
    if (req.query.player) {
      sql += ' AND (LOWER(g.player1) LIKE ? OR LOWER(g.player2) LIKE ? OR LOWER(g.loser) LIKE ?)';
      const p = `%${req.query.player.toLowerCase()}%`;
      params.push(p, p, p);
    }

    sql += ' ORDER BY g.id DESC';
    if (req.query.limit) {
      sql += ' LIMIT ' + Number(req.query.limit);
    }

    const games = await db.query(sql, params);
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/player-suggestions', async (req, res) => {
  try {
    const p1 = await db.query("SELECT DISTINCT player1 as name FROM games WHERE player1 != ''");
    const p2 = await db.query("SELECT DISTINCT player2 as name FROM games WHERE player2 != ''");
    const losers = await db.query("SELECT DISTINCT loser as name FROM games WHERE loser != ''");
    const customers = await db.query("SELECT DISTINCT customer_name as name FROM loans WHERE customer_name != ''");
    const names = [...new Set([...p1, ...p2, ...losers, ...customers].map(x => x.name.trim()).filter(Boolean))].sort();
    res.json(names);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/player-losses', async (req, res) => {
  try {
    const { date, p1, p2 } = req.query;
    const d = date || todayStr();
    const l1 = await db.queryOne("SELECT COUNT(*) as c FROM games WHERE date = ? AND LOWER(loser) = LOWER(?) AND status = 'completed'", [d, p1 || '']);
    const l2 = await db.queryOne("SELECT COUNT(*) as c FROM games WHERE date = ? AND LOWER(loser) = LOWER(?) AND status = 'completed'", [d, p2 || '']);
    res.json({ [p1]: l1?.c || 0, [p2]: l2?.c || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/final-preview/:id', (req, res) => {
  res.json({ ok: true, amount: Number(req.query.amount || 0) });
});

app.put('/api/games/:id', requireAuth, async (req, res) => {
  try {
    const b = req.body;
    const id = req.params.id;
    const fields = [];
    const params = [];

    ['loser', 'winner', 'player1', 'player2', 'loan_phone', 'payment_method', 'payment_status'].forEach(f => {
      if (b[f] !== undefined) {
        fields.push(`${f} = ?`);
        params.push(b[f]);
      }
    });

    if (fields.length > 0) {
      params.push(id);
      await db.execute(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/games/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM games WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BILLS API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/bills/summary/pending', async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const rows = await db.queryOne("SELECT COUNT(*) as count, SUM(total_amount) as total FROM bills WHERE date = ? AND status = 'pending'", [date]);
    res.json({ count: rows?.count || 0, total: rows?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills/plus/all', async (req, res) => {
  try {
    const bills = await db.query("SELECT * FROM bills WHERE plus_amount > plus_used");
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await db.queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const games = await db.query('SELECT * FROM games WHERE bill_id = ?', [bill.id]);
    const orders = await db.query('SELECT * FROM cafe_orders WHERE bill_id = ?', [bill.id]);
    res.json({ bill, games, cafe_orders: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/:id/checkout', requireAuth, async (req, res) => {
  try {
    const b = req.body;
    const id = req.params.id;
    const bill = await db.queryOne('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const cash = Number(b.cash_amount || 0);
    const online = Number(b.online_amount || 0);
    const loan = Number(b.loan_amount || 0);
    const disc = Number(b.discount || 0);
    const plusUsed = Number(b.plus_used || 0);

    await db.execute(`
      UPDATE bills SET
        status = 'paid',
        cash_amount = ?,
        online_amount = ?,
        loan_amount = ?,
        discount = ?,
        plus_used = ?,
        online_method = ?,
        checkout_at = datetime('now','localtime')
      WHERE id = ?
    `, [cash, online, loan, disc, plusUsed, b.online_method || 'online', id]);

    if (loan > 0) {
      await db.execute(`
        INSERT INTO loans (customer_name, phone, amount, paid_amount, status, bill_id)
        VALUES (?, ?, ?, 0, 'unpaid', ?)
      `, [bill.player_name, bill.phone, loan, id]);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bills/:id/phone', requireAuth, async (req, res) => {
  try {
    await db.execute('UPDATE bills SET phone = ? WHERE id = ?', [req.body.phone || '', req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bills/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE games SET bill_id = NULL WHERE bill_id = ?', [req.params.id]);
    await db.execute('DELETE FROM bills WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/:id/cash-plus', requireAuth, (req, res) => { res.json({ ok: true }); });

// ─────────────────────────────────────────────────────────────────────────────
// CAFE & INVENTORY API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/cafe/inventory', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM cafe_inventory WHERE active = 1 ORDER BY category, name');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cafe/inventory', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const sql = `
      INSERT INTO cafe_inventory (name, price, cost_price, stock, unit, category, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `;
    const result = await db.execute(sql, [
      b.name, Number(b.price || 0), Number(b.cost_price || 0), Number(b.stock || 0), b.unit || 'piece', b.category || 'Other'
    ]);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cafe/inventory/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    await db.execute(`
      UPDATE cafe_inventory SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        cost_price = COALESCE(?, cost_price),
        stock = COALESCE(?, stock),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `, [b.name, b.category, b.price !== undefined ? Number(b.price) : null, b.cost_price !== undefined ? Number(b.cost_price) : null, b.stock !== undefined ? Number(b.stock) : null, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cafe/inventory/:id/restock', requireAdmin, async (req, res) => {
  try {
    const qty = Number(req.body.qty || 0);
    await db.execute('UPDATE cafe_inventory SET stock = stock + ?, updated_at = datetime("now","localtime") WHERE id = ?', [qty, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cafe/inventory/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE cafe_inventory SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cafe/orders', async (req, res) => {
  try {
    let sql = 'SELECT * FROM cafe_orders WHERE 1=1';
    const params = [];
    if (req.query.date) {
      sql += ' AND date = ?';
      params.push(req.query.date);
    }
    sql += ' ORDER BY id DESC';
    const orders = await db.query(sql, params);

    for (const o of orders) {
      o.items = await db.query('SELECT * FROM cafe_order_items WHERE order_id = ?', [o.id]);
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cafe/orders', requireAuth, async (req, res) => {
  try {
    const b = req.body;
    const items = b.items || [];
    let total = 0;
    items.forEach(it => { total += (Number(it.unit_price || it.price || 0) * Number(it.qty || 1)); });

    const date = b.date || todayStr();
    const empId = req.session.user?.id || 161;
    const status = b.status || (b.payment_method === 'loan' ? 'loan' : 'paid');

    const paidCash = b.payment_method === 'cash' ? total : Number(b.paid_cash || 0);
    const paidOnline = (b.payment_method === 'online' || b.payment_method === 'easypaisa') ? total : Number(b.paid_online || 0);

    const insert = `
      INSERT INTO cafe_orders (
        table_id, table_name, game_id, player_name, phone, date, total, status,
        employee_id, payment_method, paid_cash, paid_online, board_cash_base, board_online_base
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.execute(insert, [
      b.table_id || null, b.table_name || null, b.game_id || null, b.player_name || null,
      b.phone || null, date, total, status, empId, b.payment_method || 'cash',
      paidCash, paidOnline, paidCash, paidOnline
    ]);

    const orderId = result.lastInsertRowid;

    for (const it of items) {
      const itTotal = Number(it.unit_price || it.price || 0) * Number(it.qty || 1);
      await db.execute(`
        INSERT INTO cafe_order_items (order_id, item_id, item_name, qty, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderId, it.item_id || it.id, it.item_name || it.name, it.qty, it.unit_price || it.price, itTotal]);

      await db.execute('UPDATE cafe_inventory SET stock = MAX(0, stock - ?) WHERE id = ?', [it.qty, it.item_id || it.id]);
    }

    if (status === 'loan' && b.player_name) {
      await db.execute(`
        INSERT INTO loans (customer_name, phone, amount, paid_amount, status, order_id)
        VALUES (?, ?, ?, 0, 'unpaid', ?)
      `, [b.player_name, b.phone || '', total, orderId]);
    }

    res.json({ ok: true, id: orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cafe/orders/:id/status', requireAuth, async (req, res) => {
  try {
    await db.execute('UPDATE cafe_orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cafe/orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM cafe_order_items WHERE order_id = ?', [req.params.id]);
    for (const it of items) {
      await db.execute('UPDATE cafe_inventory SET stock = stock + ? WHERE id = ?', [it.qty, it.item_id]);
    }
    await db.execute("UPDATE cafe_orders SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cafe/summary', async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const summary = await db.queryOne(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(paid_cash), 0) as cash_sales,
        COALESCE(SUM(paid_online), 0) as online_sales
      FROM cafe_orders WHERE date = ? AND status != 'cancelled'
    `, [date]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cafe/stock-summary', async (req, res) => {
  try {
    const items = await db.query('SELECT id, name, category, stock, price, cost_price FROM cafe_inventory WHERE active = 1');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOANS (KHATA) API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/loans', async (req, res) => {
  try {
    let sql = 'SELECT * FROM loans WHERE 1=1';
    const params = [];
    if (req.query.search) {
      sql += ' AND (LOWER(customer_name) LIKE ? OR phone LIKE ?)';
      params.push(`%${req.query.search.toLowerCase()}%`, `%${req.query.search}%`);
    }
    if (req.query.status) {
      sql += ' AND status = ?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY id DESC';
    const loans = await db.query(sql, params);
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/loans/summary/all', async (req, res) => {
  try {
    const stats = await db.queryOne(`
      SELECT
        COALESCE(SUM(amount), 0) as total_loaned,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(amount - paid_amount), 0) as outstanding,
        COUNT(CASE WHEN amount > paid_amount THEN 1 END) as pending_count
      FROM loans
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/loans/by-person', async (req, res) => {
  try {
    const byPerson = await db.query(`
      SELECT
        customer_name as name,
        phone,
        SUM(amount) as total_loan,
        SUM(paid_amount) as total_paid,
        SUM(amount - paid_amount) as balance,
        COUNT(*) as loan_count,
        MAX(created_at) as last_date
      FROM loans
      GROUP BY customer_name, phone
      ORDER BY balance DESC
    `);
    res.json(byPerson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/loans', requireAuth, async (req, res) => {
  try {
    const { customer_name, phone, amount } = req.body;
    if (!customer_name || !amount) return res.status(400).json({ error: 'Customer name and amount are required' });
    const result = await db.execute(`
      INSERT INTO loans (customer_name, phone, amount, paid_amount, status)
      VALUES (?, ?, ?, 0, 'unpaid')
    `, [customer_name.trim(), phone || '', Number(amount)]);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/loans/pay-customer', requireAuth, async (req, res) => {
  try {
    const { customer_name, phone, amount } = req.body;
    let remaining = Number(amount || 0);
    if (remaining <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    await db.execute(`
      INSERT INTO loan_payments (customer_name, phone, amount, date, employee_id)
      VALUES (?, ?, ?, ?, ?)
    `, [customer_name, phone || '', remaining, todayStr(), req.session.user?.id || 161]);

    const loans = await db.query(`
      SELECT * FROM loans
      WHERE LOWER(customer_name) = LOWER(?) AND (amount > paid_amount)
      ORDER BY id ASC
    `, [customer_name]);

    for (const l of loans) {
      if (remaining <= 0) break;
      const due = l.amount - l.paid_amount;
      const pay = Math.min(due, remaining);
      const newPaid = l.paid_amount + pay;
      const newStatus = newPaid >= l.amount ? 'paid' : 'partial';
      await db.execute('UPDATE loans SET paid_amount = ?, status = ?, updated_at = datetime("now","localtime") WHERE id = ?', [newPaid, newStatus, l.id]);
      remaining -= pay;
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/loans/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM loans WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/export/loans', requireAdmin, async (req, res) => {
  try {
    const loans = await db.query('SELECT * FROM loans ORDER BY id DESC');
    let csv = 'ID,Customer,Phone,Amount,Paid,Status,Created\n';
    loans.forEach(l => {
      csv += `"${l.id}","${l.customer_name}","${l.phone}","${l.amount}","${l.paid_amount}","${l.status}","${l.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=loans.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/expenses', async (req, res) => {
  try {
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    if (req.query.from) {
      sql += ' AND date >= ?';
      params.push(req.query.from);
    }
    if (req.query.to) {
      sql += ' AND date <= ?';
      params.push(req.query.to);
    }
    if (req.query.source) {
      sql += ' AND source = ?';
      params.push(req.query.source);
    }
    sql += ' ORDER BY id DESC';
    const exps = await db.query(sql, params);
    res.json(exps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', requireAuth, async (req, res) => {
  try {
    const { date, category, description, amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });
    const result = await db.execute(`
      INSERT INTO expenses (date, category, description, amount, employee_id, source, employee_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      date || todayStr(), category || 'Tea / Snacks', description || null, Number(amount),
      req.session.user?.id || 161, req.session.user?.role || 'employee', req.session.user?.full_name || 'Staff'
    ]);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD, REPORTS & REVENUE (BOARD CLEARS) API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const d = req.query.date || todayStr();

    let lastClearTime = null;
    if (req.query.shift === '1') {
      const lastClear = await db.queryOne('SELECT cleared_at FROM board_clears ORDER BY id DESC LIMIT 1');
      if (lastClear) lastClearTime = lastClear.cleared_at;
    }

    let gameCondition = "WHERE date = ? AND status = 'completed'";
    let cafeCondition = "WHERE date = ? AND status != 'cancelled'";
    let expCondition = 'WHERE date = ?';
    let payCondition = 'WHERE date = ?';

    const gParams = [d];
    const cParams = [d];
    const eParams = [d];
    const pParams = [d];

    if (lastClearTime) {
      gameCondition += ' AND created_at > ?';
      gParams.push(lastClearTime);
      cafeCondition += ' AND created_at > ?';
      cParams.push(lastClearTime);
      expCondition += ' AND created_at > ?';
      eParams.push(lastClearTime);
      payCondition += ' AND created_at > ?';
      pParams.push(lastClearTime);
    }

    const gameStats = await db.queryOne(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(paid_cash), 0) as cash,
        COALESCE(SUM(paid_online), 0) as online,
        COALESCE(SUM(loan_amount), 0) as loan
      FROM games ${gameCondition}
    `, gParams);

    const cafeStats = await db.queryOne(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(paid_cash), 0) as cash,
        COALESCE(SUM(paid_online), 0) as online
      FROM cafe_orders ${cafeCondition}
    `, cParams);

    const expStats = await db.queryOne(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${expCondition}`, eParams);
    const loanRecStats = await db.queryOne(`SELECT COALESCE(SUM(amount), 0) as total FROM loan_payments ${payCondition}`, pParams);

    const cashSale = Number(gameStats?.cash || 0) + Number(cafeStats?.cash || 0) + Number(loanRecStats?.total || 0);
    const onlineSale = Number(gameStats?.online || 0) + Number(cafeStats?.online || 0);
    const totalSale = Number(gameStats?.total || 0) + Number(cafeStats?.total || 0);
    const expenses = Number(expStats?.total || 0);
    const netProfit = cashSale + onlineSale - expenses;

    const activeTables = await db.queryOne("SELECT COUNT(*) as c FROM games WHERE status = 'active'");
    const totalTables = await db.queryOne("SELECT COUNT(*) as c FROM tables WHERE active = 1");

    res.json({
      totalSale,
      netProfit,
      cashSale,
      onlineSale,
      expenses,
      loanRecovered: Number(loanRecStats?.total || 0),
      loanGiven: Number(gameStats?.loan || 0),
      activeTables: activeTables?.c || 0,
      totalTables: totalTables?.c || 0,
      gameCount: Number(gameStats?.count || 0),
      cafeOrderCount: Number(cafeStats?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/board-clear', requireAuth, async (req, res) => {
  try {
    const lastClear = await db.queryOne('SELECT cleared_at FROM board_clears ORDER BY id DESC LIMIT 1');
    const lastTime = lastClear ? lastClear.cleared_at : '2000-01-01 00:00:00';

    const g = await db.queryOne("SELECT COALESCE(SUM(paid_cash),0) as c, COALESCE(SUM(paid_online),0) as o FROM games WHERE created_at > ? AND status = 'completed'", [lastTime]);
    const c = await db.queryOne("SELECT COALESCE(SUM(paid_cash),0) as c, COALESCE(SUM(paid_online),0) as o FROM cafe_orders WHERE created_at > ? AND status != 'cancelled'", [lastTime]);
    const l = await db.queryOne("SELECT COALESCE(SUM(amount),0) as c FROM loan_payments WHERE created_at > ? ", [lastTime]);

    const cash = Number(g?.c || 0) + Number(c?.c || 0) + Number(l?.c || 0);
    const online = Number(g?.o || 0) + Number(c?.o || 0);
    const total = cash + online;

    await db.execute(`
      INSERT INTO board_clears (cash_sale, online_sale, total_sale, employee_id, employee_name)
      VALUES (?, ?, ?, ?, ?)
    `, [cash, online, total, req.session.user?.id || 160, req.session.user?.full_name || 'Admin']);

    res.json({ ok: true, cleared: { cash, online, total } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/board-clears', requireAdmin, async (req, res) => {
  try {
    const clears = await db.query('SELECT * FROM board_clears ORDER BY id DESC');
    res.json(clears);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/monthly', async (req, res) => {
  try {
    const monthly = await db.query(`
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(amount) as game_sales,
        COUNT(*) as total_games
      FROM games
      WHERE status = 'completed'
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/weekly', async (req, res) => {
  try {
    const weekly = await db.query(`
      SELECT
        date,
        SUM(amount) as sales,
        COUNT(*) as games
      FROM games
      WHERE status = 'completed'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `);
    res.json(weekly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/employee-shift', requireAuth, async (req, res) => {
  try {
    const empId = req.session.user?.id || 161;
    const d = req.query.date || todayStr();
    const stats = await db.queryOne(`
      SELECT
        COUNT(*) as game_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(paid_cash), 0) as cash_amount,
        COALESCE(SUM(paid_online), 0) as online_amount
      FROM games
      WHERE employee_id = ? AND date = ? AND status = 'completed'
    `, [empId, d]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS & STAFF API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.query('SELECT id, username, full_name, role, phone, email, active, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, role, phone } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const result = await db.execute(`
      INSERT INTO users (username, password, full_name, role, phone, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [username.trim().toLowerCase(), password, full_name || username, role || 'employee', phone || '']);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const id = req.params.id;
    if (b.password) {
      await db.execute('UPDATE users SET password = ? WHERE id = ?', [b.password, id]);
    }
    if (b.full_name) {
      await db.execute('UPDATE users SET full_name = ? WHERE id = ?', [b.full_name, id]);
    }
    if (b.phone !== undefined) {
      await db.execute('UPDATE users SET phone = ? WHERE id = ?', [b.phone, id]);
    }
    if (b.role) {
      await db.execute('UPDATE users SET role = ? WHERE id = ?', [b.role, id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE users SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/me/password', requireAuth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const u = await db.queryOne('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
    if (!u || u.password !== old_password) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [new_password, req.session.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/audit', requireAdmin, async (req, res) => {
  try {
    const logs = await db.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone runner (when started directly via node server.js)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🎱 CueZone Snooker Club Server running on http://localhost:${PORT}`);
    console.log(`- Admin Portal:    http://localhost:${PORT}/admin (admindemo / admindemo)`);
    console.log(`- Employee Portal: http://localhost:${PORT}/employee (emp786 / emp786)`);
    console.log(`=================================================`);
  });
}

module.exports = app;
