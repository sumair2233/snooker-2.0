import fs from "fs";
import path from "path";
import { sql } from "@vercel/postgres";
import {
  User,
  ClubTable,
  TableRates,
  Game,
  PlayerBill,
  Loan,
  Expense,
  RevenueEntry,
  CafeItem,
  CafeOrder,
  VoidRequest,
  AuditLog,
  ClubSettings,
} from "@/types";
import {
  initialUsers,
  initialTables,
  initialGames,
  initialPlayerBills,
  initialLoans,
  initialExpenses,
  initialRevenue,
  initialCafeItems,
  initialCafeOrders,
  initialVoidRequests,
  initialAuditLogs,
  initialSettings,
} from "./seed-data";
import { appKv } from "./kv";

/* ==========================================================================
   ENVIRONMENT & DATABASE DETECTION
   ========================================================================== */

function hasPostgres(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

/* ==========================================================================
   LOCAL JSON / IN-MEMORY FALLBACK STORE
   ========================================================================== */

interface SnookerDatabase {
  users: User[];
  tables: ClubTable[];
  games: Game[];
  playerBills: PlayerBill[];
  loans: Loan[];
  expenses: Expense[];
  revenue: RevenueEntry[];
  cafeItems: CafeItem[];
  cafeOrders: CafeOrder[];
  voidRequests: VoidRequest[];
  auditLogs: AuditLog[];
  settings: ClubSettings;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "snooker-db.json");

function ensureDbFile(): SnookerDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading database file, resetting to initial seed:", err);
  }

  const initialDb: SnookerDatabase = {
    users: initialUsers,
    tables: initialTables,
    games: initialGames,
    playerBills: initialPlayerBills,
    loans: initialLoans,
    expenses: initialExpenses,
    revenue: initialRevenue,
    cafeItems: initialCafeItems,
    cafeOrders: initialCafeOrders,
    voidRequests: initialVoidRequests,
    auditLogs: initialAuditLogs,
    settings: initialSettings,
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing initial database file:", err);
  }

  // Pre-seed KV with live tables
  initialGames
    .filter((g) => g.status === "live")
    .forEach((g) => {
      appKv.set(`table:live:${g.table_id}`, g);
    });

  return initialDb;
}

let memoryDb: SnookerDatabase | null = null;

function getDb(): SnookerDatabase {
  if (!memoryDb) {
    memoryDb = ensureDbFile();
  }
  return memoryDb;
}

function saveDb(db: SnookerDatabase): void {
  memoryDb = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

/* ==========================================================================
   POSTGRESQL ROW MAPPERS
   ========================================================================== */

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val as T;
}

function toIsoString(val: unknown, fallback = new Date().toISOString()): string {
  if (!val) return fallback;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function mapUserRow(r: any): User {
  return {
    id: r.id,
    name: r.name,
    username: r.username,
    role: r.role,
    pin_hash: r.pin_hash,
    active: Boolean(r.active),
    created_at: toIsoString(r.created_at),
  };
}

function mapTableRow(r: any): ClubTable {
  return {
    id: r.id,
    table_number: Number(r.table_number),
    name: r.name,
    brand: r.brand,
    rates: parseJsonField<TableRates>(r.rates, {
      ball15: 120,
      ball10: 90,
      ball6: 60,
      centuryPerMin: 6,
    }),
    active: Boolean(r.active),
  };
}

function mapGameRow(r: any): Game {
  return {
    id: r.id,
    table_id: r.table_id,
    table_name: r.table_name,
    type: r.type,
    ball_count: r.ball_count,
    rate: Number(r.rate || 0),
    players: parseJsonField<string[]>(r.players, []),
    loser: r.loser || null,
    start_time: toIsoString(r.start_time),
    end_time: r.end_time ? toIsoString(r.end_time) : null,
    duration_minutes: r.duration_minutes ? Number(r.duration_minutes) : null,
    status: r.status,
    payment_method: r.payment_method || null,
    amount: Number(r.amount || 0),
    cash_amount: Number(r.cash_amount || 0),
    online_amount: Number(r.online_amount || 0),
    discount: Number(r.discount || 0),
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    notes: r.notes || null,
    created_at: toIsoString(r.created_at),
  };
}

function mapPlayerBillRow(r: any): PlayerBill {
  return {
    id: r.id,
    player_name: r.player_name,
    phone: r.phone || "",
    game_ids: parseJsonField<string[]>(r.game_ids, []),
    game_amount: Number(r.game_amount || 0),
    cafe_amount: Number(r.cafe_amount || 0),
    discount: Number(r.discount || 0),
    paid: Number(r.paid || 0),
    loan: Number(r.loan || 0),
    balance: Number(r.balance || 0),
    status: r.status,
    last_activity: toIsoString(r.last_activity),
    created_at: toIsoString(r.created_at),
    updated_at: toIsoString(r.updated_at),
  };
}

function mapLoanRow(r: any): Loan {
  return {
    id: r.id,
    customer_name: r.customer_name,
    phone: r.phone || "",
    amount: Number(r.amount || 0),
    paid: Number(r.paid || 0),
    remaining: Number(r.remaining || 0),
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
    reason: r.reason || "",
    status: r.status,
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    created_at: toIsoString(r.created_at),
  };
}

function mapExpenseRow(r: any): Expense {
  return {
    id: r.id,
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
    category: r.category,
    amount: Number(r.amount || 0),
    note: r.note || "",
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    created_at: toIsoString(r.created_at),
  };
}

function mapRevenueRow(r: any): RevenueEntry {
  return {
    id: r.id,
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
    category: r.category,
    amount: Number(r.amount || 0),
    payment_method: r.payment_method,
    note: r.note || "",
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    created_at: toIsoString(r.created_at),
  };
}

function mapCafeItemRow(r: any): CafeItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    purchase_price: Number(r.purchase_price || 0),
    sale_price: Number(r.sale_price || 0),
    stock: Number(r.stock || 0),
    active: Boolean(r.active),
  };
}

function mapCafeOrderRow(r: any): CafeOrder {
  return {
    id: r.id,
    player_name_or_walkin: r.player_name_or_walkin,
    is_walkin: Boolean(r.is_walkin),
    items: parseJsonField(r.items, []),
    total: Number(r.total || 0),
    discount: Number(r.discount || 0),
    net_total: Number(r.net_total || 0),
    payment_method: r.payment_method,
    status: r.status,
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    created_at: toIsoString(r.created_at),
  };
}

function mapVoidRequestRow(r: any): VoidRequest {
  return {
    id: r.id,
    game_id: r.game_id,
    table_name: r.table_name,
    amount: Number(r.amount || 0),
    reason: r.reason,
    requested_by_id: r.requested_by_id,
    requested_by_name: r.requested_by_name,
    status: r.status,
    reviewed_by_name: r.reviewed_by_name || null,
    reviewed_at: r.reviewed_at ? toIsoString(r.reviewed_at) : null,
    admin_notes: r.admin_notes || null,
    created_at: toIsoString(r.created_at),
  };
}

function mapAuditLogRow(r: any): AuditLog {
  return {
    id: r.id,
    actor_id: r.actor_id,
    actor_name: r.actor_name,
    action: r.action,
    entity: r.entity,
    entity_id: r.entity_id,
    details: r.details,
    before: parseJsonField(r.before, null),
    after: parseJsonField(r.after, null),
    timestamp: toIsoString(r.timestamp),
  };
}

function mapSettingsRow(r: any): ClubSettings {
  return {
    club_name: r.club_name,
    phone: r.phone || "",
    address: r.address || "",
    currency: r.currency || "Rs.",
    table_count: Number(r.table_count || 6),
    century_rate_per_min: Number(r.century_rate_per_min || 6),
    receipt_footer: r.receipt_footer || "",
    last_cash_collection: parseJsonField(r.last_cash_collection, null),
  };
}

/* ==========================================================================
   USERS
   ========================================================================== */

export async function getUsers(): Promise<User[]> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM users ORDER BY name ASC");
      if (res.rows.length > 0) {
        return res.rows.map(mapUserRow);
      }
    } catch (e) {
      console.warn("Postgres getUsers fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.users;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const clean = username.trim();
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1", [clean]);
      if (res.rows.length > 0) {
        return mapUserRow(res.rows[0]);
      }
      return null;
    } catch (e) {
      console.warn("Postgres getUserByUsername fallback to local JSON:", e);
    }
  }
  const db = getDb();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === clean.toLowerCase()
  );
  return user || null;
}

export async function getUserById(id: string): Promise<User | null> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        return mapUserRow(res.rows[0]);
      }
      return null;
    } catch (e) {
      console.warn("Postgres getUserById fallback to local JSON:", e);
    }
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === id);
  return user || null;
}

export async function saveUser(user: User): Promise<User> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO users (id, name, username, role, pin_hash, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           username = EXCLUDED.username,
           role = EXCLUDED.role,
           pin_hash = EXCLUDED.pin_hash,
           active = EXCLUDED.active;`,
        [user.id, user.name, user.username, user.role, user.pin_hash, user.active, user.created_at || new Date().toISOString()]
      );
    } catch (e) {
      console.warn("Postgres saveUser error:", e);
    }
  }
  const db = getDb();
  const idx = db.users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    db.users[idx] = user;
  } else {
    db.users.push(user);
  }
  saveDb(db);
  return user;
}

/* ==========================================================================
   TABLES & LIVE STATE
   ========================================================================== */

export async function getTables(): Promise<ClubTable[]> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM tables ORDER BY table_number ASC");
      if (res.rows.length > 0) {
        return res.rows.map(mapTableRow);
      }
    } catch (e) {
      console.warn("Postgres getTables fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.tables.sort((a, b) => a.table_number - b.table_number);
}

export async function getTableById(id: string): Promise<ClubTable | null> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM tables WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        return mapTableRow(res.rows[0]);
      }
      return null;
    } catch (e) {
      console.warn("Postgres getTableById fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.tables.find((t) => t.id === id) || null;
}

export async function saveTable(table: ClubTable): Promise<ClubTable> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO tables (id, table_number, name, brand, rates, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           table_number = EXCLUDED.table_number,
           name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           rates = EXCLUDED.rates,
           active = EXCLUDED.active;`,
        [table.id, table.table_number, table.name, table.brand, JSON.stringify(table.rates), table.active]
      );
    } catch (e) {
      console.warn("Postgres saveTable error:", e);
    }
  }
  const db = getDb();
  const idx = db.tables.findIndex((t) => t.id === table.id);
  if (idx >= 0) {
    db.tables[idx] = table;
  } else {
    db.tables.push(table);
  }
  saveDb(db);
  return table;
}

export async function getLiveTablesState(): Promise<{
  tables: ClubTable[];
  activeGames: Record<string, Game>;
}> {
  const tables = await getTables();
  const activeGames: Record<string, Game> = {};

  // 1. Try checking KV first for ultra-fast response
  for (const table of tables) {
    const liveGame = await appKv.get<Game>(`table:live:${table.id}`);
    if (liveGame && liveGame.status === "live") {
      activeGames[table.id] = liveGame;
    }
  }

  // 2. Query Postgres or Local DB for live games to ensure KV sync
  let dbLiveGames: Game[] = [];
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM games WHERE status = 'live'");
      dbLiveGames = res.rows.map(mapGameRow);
    } catch (e) {
      console.warn("Postgres getLiveTablesState live query error:", e);
      const db = getDb();
      dbLiveGames = db.games.filter((g) => g.status === "live");
    }
  } else {
    const db = getDb();
    dbLiveGames = db.games.filter((g) => g.status === "live");
  }

  for (const game of dbLiveGames) {
    if (!activeGames[game.table_id]) {
      activeGames[game.table_id] = game;
      await appKv.set(`table:live:${game.table_id}`, game);
    }
  }

  return { tables, activeGames };
}

/* ==========================================================================
   GAMES
   ========================================================================== */

export async function getGames(filters?: {
  fromDate?: string;
  toDate?: string;
  tableId?: string;
  type?: string;
  status?: string;
  employeeId?: string;
  paymentMethod?: string;
  playerSearch?: string;
}): Promise<Game[]> {
  if (hasPostgres()) {
    try {
      let query = "SELECT * FROM games WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (filters?.fromDate) {
        query += ` AND start_time >= $${pIdx++}`;
        params.push(filters.fromDate + "T00:00:00.000Z");
      }
      if (filters?.toDate) {
        query += ` AND start_time <= $${pIdx++}`;
        params.push(filters.toDate + "T23:59:59.999Z");
      }
      if (filters?.tableId) {
        query += ` AND table_id = $${pIdx++}`;
        params.push(filters.tableId);
      }
      if (filters?.type && filters.type !== "all") {
        query += ` AND type = $${pIdx++}`;
        params.push(filters.type);
      }
      if (filters?.status && filters.status !== "all") {
        query += ` AND status = $${pIdx++}`;
        params.push(filters.status);
      }
      if (filters?.employeeId && filters.employeeId !== "all") {
        query += ` AND employee_id = $${pIdx++}`;
        params.push(filters.employeeId);
      }
      if (filters?.paymentMethod && filters.paymentMethod !== "all") {
        query += ` AND payment_method = $${pIdx++}`;
        params.push(filters.paymentMethod);
      }

      query += " ORDER BY start_time DESC";
      const res = await sql.query(query, params);
      let results = res.rows.map(mapGameRow);

      if (filters?.playerSearch) {
        const q = filters.playerSearch.toLowerCase().trim();
        results = results.filter((g) =>
          g.players.some((p) => p.toLowerCase().includes(q))
        );
      }
      return results;
    } catch (e) {
      console.warn("Postgres getGames fallback to local JSON:", e);
    }
  }

  const db = getDb();
  let results = [...db.games];

  if (filters?.fromDate) {
    results = results.filter(
      (g) => g.start_time.split("T")[0] >= (filters.fromDate as string)
    );
  }
  if (filters?.toDate) {
    results = results.filter(
      (g) => g.start_time.split("T")[0] <= (filters.toDate as string)
    );
  }
  if (filters?.tableId) {
    results = results.filter((g) => g.table_id === filters.tableId);
  }
  if (filters?.type && filters.type !== "all") {
    results = results.filter((g) => g.type === filters.type);
  }
  if (filters?.status && filters.status !== "all") {
    results = results.filter((g) => g.status === filters.status);
  }
  if (filters?.employeeId && filters.employeeId !== "all") {
    results = results.filter((g) => g.employee_id === filters.employeeId);
  }
  if (filters?.paymentMethod && filters.paymentMethod !== "all") {
    results = results.filter((g) => g.payment_method === filters.paymentMethod);
  }
  if (filters?.playerSearch) {
    const q = filters.playerSearch.toLowerCase().trim();
    results = results.filter((g) =>
      g.players.some((p) => p.toLowerCase().includes(q))
    );
  }

  return results.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
}

export async function getGameById(id: string): Promise<Game | null> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM games WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        return mapGameRow(res.rows[0]);
      }
      return null;
    } catch (e) {
      console.warn("Postgres getGameById fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.games.find((g) => g.id === id) || null;
}

export async function startGame(newGame: Game): Promise<Game> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO games (id, table_id, table_name, type, ball_count, rate, players, loser, start_time, end_time, duration_minutes, status, payment_method, amount, cash_amount, online_amount, discount, employee_id, employee_name, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`,
        [
          newGame.id, newGame.table_id, newGame.table_name, newGame.type, newGame.ball_count,
          newGame.rate, JSON.stringify(newGame.players), newGame.loser || null,
          newGame.start_time, newGame.end_time || null, newGame.duration_minutes || null,
          newGame.status, newGame.payment_method || null, newGame.amount || 0,
          newGame.cash_amount || 0, newGame.online_amount || 0, newGame.discount || 0,
          newGame.employee_id, newGame.employee_name, newGame.notes || null,
          newGame.created_at || new Date().toISOString()
        ]
      );
    } catch (e) {
      console.warn("Postgres startGame error:", e);
    }
  }

  const db = getDb();
  db.games.unshift(newGame);
  saveDb(db);

  // Set ephemeral state in Vercel KV
  await appKv.set(`table:live:${newGame.table_id}`, newGame);

  // Log in Audit Log
  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: newGame.employee_id,
    actor_name: newGame.employee_name,
    action: "game_start",
    entity: "game",
    entity_id: newGame.id,
    details: `Started ${newGame.type.toUpperCase()} game on ${newGame.table_name} (${newGame.players.join(" vs ")})`,
    timestamp: new Date().toISOString(),
  });

  return newGame;
}

export async function endGame(
  gameId: string,
  params: {
    loser?: string | null;
    payment_method: "cash" | "online" | "split" | "pending" | "free";
    cash_amount?: number;
    online_amount?: number;
    discount?: number;
    amount?: number;
    notes?: string;
    employee_id: string;
    employee_name: string;
  }
): Promise<Game | null> {
  const game = await getGameById(gameId);
  if (!game) return null;

  const now = new Date();
  const startTime = new Date(game.start_time);
  const durationMinutes = Math.max(
    1,
    Math.round((now.getTime() - startTime.getTime()) / 60000)
  );

  let finalAmount = params.amount ?? game.rate;
  if (game.type === "century") {
    finalAmount = params.amount ?? durationMinutes * game.rate;
  }

  const discount = params.discount || 0;
  const netAmount = Math.max(0, finalAmount - discount);
  const cashAmount = params.cash_amount || (params.payment_method === "cash" ? netAmount : 0);
  const onlineAmount = params.online_amount || (params.payment_method === "online" ? netAmount : 0);
  const loser = params.loser || null;

  game.status = "completed";
  game.end_time = now.toISOString();
  game.duration_minutes = durationMinutes;
  game.loser = loser;
  game.payment_method = params.payment_method;
  game.amount = netAmount;
  game.discount = discount;
  game.cash_amount = cashAmount;
  game.online_amount = onlineAmount;
  if (params.notes) game.notes = params.notes;

  if (hasPostgres()) {
    try {
      await sql.query(
        `UPDATE games SET
           status = 'completed',
           end_time = $1,
           duration_minutes = $2,
           loser = $3,
           payment_method = $4,
           amount = $5,
           discount = $6,
           cash_amount = $7,
           online_amount = $8,
           notes = COALESCE($9, notes)
         WHERE id = $10;`,
        [
          game.end_time, durationMinutes, loser, params.payment_method,
          netAmount, discount, cashAmount, onlineAmount, params.notes || null, game.id
        ]
      );
    } catch (e) {
      console.warn("Postgres endGame update error:", e);
    }
  }

  // Clear live state from Vercel KV
  await appKv.del(`table:live:${game.table_id}`);

  // If pending or attached to a player, update or create Player Bill
  const targetPlayer = game.loser || game.players[0];
  if (targetPlayer) {
    if (hasPostgres()) {
      try {
        const billRes = await sql.query(
          "SELECT * FROM player_bills WHERE LOWER(player_name) = LOWER($1) LIMIT 1",
          [targetPlayer]
        );
        if (billRes.rows.length === 0) {
          const newBillId = `bill-${Date.now()}`;
          const isPending = params.payment_method === "pending";
          await sql.query(
            `INSERT INTO player_bills (id, player_name, phone, game_ids, game_amount, cafe_amount, discount, paid, loan, balance, status, last_activity, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
            [
              newBillId, targetPlayer, "", JSON.stringify([game.id]), netAmount, 0, 0,
              isPending ? 0 : netAmount, 0, isPending ? netAmount : 0,
              isPending ? "pending" : "cleared", now.toISOString(), now.toISOString(), now.toISOString()
            ]
          );
        } else {
          const existing = mapPlayerBillRow(billRes.rows[0]);
          const gameIds = Array.isArray(existing.game_ids) ? existing.game_ids : [];
          if (!gameIds.includes(game.id)) gameIds.push(game.id);

          const isPending = params.payment_method === "pending";
          const newGameAmount = existing.game_amount + netAmount;
          const newBalance = isPending ? existing.balance + netAmount : existing.balance;
          const newPaid = isPending ? existing.paid : existing.paid + netAmount;
          const newStatus = newBalance > 0 ? "pending" : "cleared";

          await sql.query(
            `UPDATE player_bills SET
               game_ids = $1,
               game_amount = $2,
               balance = $3,
               paid = $4,
               status = $5,
               last_activity = $6,
               updated_at = $7
             WHERE id = $8;`,
            [
              JSON.stringify(gameIds), newGameAmount, newBalance, newPaid,
              newStatus, now.toISOString(), now.toISOString(), existing.id
            ]
          );
        }
      } catch (e) {
        console.warn("Postgres endGame player bill error:", e);
      }
    }

    // Keep local JSON in sync
    const db = getDb();
    let localBill = db.playerBills.find(
      (b) => b.player_name.toLowerCase() === targetPlayer.toLowerCase()
    );
    if (!localBill) {
      localBill = {
        id: `bill-${Date.now()}`,
        player_name: targetPlayer,
        phone: "",
        game_ids: [game.id],
        game_amount: netAmount,
        cafe_amount: 0,
        discount: 0,
        paid: params.payment_method === "pending" ? 0 : netAmount,
        loan: 0,
        balance: params.payment_method === "pending" ? netAmount : 0,
        status: params.payment_method === "pending" ? "pending" : "cleared",
        last_activity: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      db.playerBills.push(localBill);
    } else {
      if (!localBill.game_ids.includes(game.id)) localBill.game_ids.push(game.id);
      localBill.game_amount += netAmount;
      if (params.payment_method === "pending") {
        localBill.balance += netAmount;
        localBill.status = "pending";
      } else {
        localBill.paid += netAmount;
      }
      localBill.last_activity = now.toISOString();
      localBill.updated_at = now.toISOString();
    }
  }

  // Sync memory db
  const db = getDb();
  const idx = db.games.findIndex((g) => g.id === gameId);
  if (idx >= 0) db.games[idx] = game;
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: params.employee_id,
    actor_name: params.employee_name,
    action: "game_end",
    entity: "game",
    entity_id: game.id,
    details: `Ended game on ${game.table_name}. Loser: ${game.loser || "N/A"}. Total: Rs. ${netAmount} (${params.payment_method})`,
    timestamp: now.toISOString(),
  });

  return game;
}

export async function updateGame(id: string, updates: Partial<Game>): Promise<Game | null> {
  if (hasPostgres()) {
    try {
      const existing = await getGameById(id);
      if (existing) {
        const merged = { ...existing, ...updates };
        await sql.query(
          `UPDATE games SET
             table_name = $1,
             type = $2,
             ball_count = $3,
             rate = $4,
             players = $5,
             loser = $6,
             status = $7,
             payment_method = $8,
             amount = $9,
             cash_amount = $10,
             online_amount = $11,
             discount = $12,
             notes = $13
           WHERE id = $14;`,
          [
            merged.table_name, merged.type, merged.ball_count, merged.rate,
            JSON.stringify(merged.players), merged.loser || null, merged.status,
            merged.payment_method, merged.amount, merged.cash_amount, merged.online_amount,
            merged.discount, merged.notes || null, id
          ]
        );
      }
    } catch (e) {
      console.warn("Postgres updateGame error:", e);
    }
  }

  const db = getDb();
  const idx = db.games.findIndex((g) => g.id === id);
  if (idx < 0) return null;

  db.games[idx] = { ...db.games[idx], ...updates };
  saveDb(db);
  return db.games[idx];
}

/* ==========================================================================
   PLAYER BILLS & CHECKOUT
   ========================================================================== */

export async function getPlayerBills(filters?: {
  status?: string;
  search?: string;
}): Promise<PlayerBill[]> {
  if (hasPostgres()) {
    try {
      let query = "SELECT * FROM player_bills WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (filters?.status && filters.status !== "all") {
        query += ` AND status = $${pIdx++}`;
        params.push(filters.status);
      }
      if (filters?.search) {
        query += ` AND (LOWER(player_name) ILIKE $${pIdx} OR phone ILIKE $${pIdx})`;
        params.push(`%${filters.search.trim().toLowerCase()}%`);
        pIdx++;
      }

      query += " ORDER BY last_activity DESC";
      const res = await sql.query(query, params);
      return res.rows.map(mapPlayerBillRow);
    } catch (e) {
      console.warn("Postgres getPlayerBills fallback to local JSON:", e);
    }
  }

  const db = getDb();
  let bills = [...db.playerBills];

  if (filters?.status && filters.status !== "all") {
    bills = bills.filter((b) => b.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    bills = bills.filter(
      (b) =>
        b.player_name.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q)
    );
  }

  return bills.sort(
    (a, b) =>
      new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
  );
}

export async function getPlayerBillById(id: string): Promise<PlayerBill | null> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM player_bills WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        return mapPlayerBillRow(res.rows[0]);
      }
      return null;
    } catch (e) {
      console.warn("Postgres getPlayerBillById fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.playerBills.find((b) => b.id === id) || null;
}

export async function checkoutPlayerBill(
  billId: string,
  data: {
    paidAmount: number;
    paymentMethod: "cash" | "online" | "split";
    cashAmount?: number;
    onlineAmount?: number;
    discount?: number;
    convertToLoan?: boolean;
    loanReason?: string;
    employee_id: string;
    employee_name: string;
  }
): Promise<PlayerBill | null> {
  const bill = await getPlayerBillById(billId);
  if (!bill) return null;

  const now = new Date();
  const discount = data.discount || 0;
  const previousBalance = bill.balance;
  const newDiscount = bill.discount + discount;
  const newPaid = bill.paid + data.paidAmount;
  let remaining = Math.max(0, previousBalance - data.paidAmount - discount);
  let loanAdded = 0;

  if (data.convertToLoan && remaining > 0) {
    loanAdded = remaining;
    const loanRecord: Loan = {
      id: `loan-${Date.now()}`,
      customer_name: bill.player_name,
      phone: bill.phone,
      amount: remaining,
      paid: 0,
      remaining: remaining,
      date: now.toISOString().split("T")[0],
      reason: data.loanReason || "Checkout converted to loan",
      status: "outstanding",
      employee_id: data.employee_id,
      employee_name: data.employee_name,
      created_at: now.toISOString(),
    };
    await addLoan(loanRecord);
    remaining = 0;
  }

  const finalLoan = bill.loan + loanAdded;
  const finalBalance = remaining;
  const finalStatus = remaining === 0 ? "cleared" : "pending";
  const nowIso = now.toISOString();

  if (hasPostgres()) {
    try {
      await sql.query(
        `UPDATE player_bills SET
           discount = $1,
           paid = $2,
           loan = $3,
           balance = $4,
           status = $5,
           last_activity = $6,
           updated_at = $7
         WHERE id = $8;`,
        [newDiscount, newPaid, finalLoan, finalBalance, finalStatus, nowIso, nowIso, billId]
      );
    } catch (e) {
      console.warn("Postgres checkoutPlayerBill error:", e);
    }
  }

  // Local sync
  const db = getDb();
  const localBill = db.playerBills.find((b) => b.id === billId);
  if (localBill) {
    localBill.discount = newDiscount;
    localBill.paid = newPaid;
    localBill.loan = finalLoan;
    localBill.balance = finalBalance;
    localBill.status = finalStatus;
    localBill.last_activity = nowIso;
    localBill.updated_at = nowIso;
    saveDb(db);
  }

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: data.employee_id,
    actor_name: data.employee_name,
    action: "bill_checkout",
    entity: "bill",
    entity_id: bill.id,
    details: `Checkout for ${bill.player_name}: Paid Rs. ${data.paidAmount} (${data.paymentMethod})${
      data.convertToLoan ? `, converted Rs. ${loanAdded} to Loan` : ""
    }. New Balance: Rs. ${finalBalance}`,
    timestamp: nowIso,
  });

  bill.discount = newDiscount;
  bill.paid = newPaid;
  bill.loan = finalLoan;
  bill.balance = finalBalance;
  bill.status = finalStatus;
  bill.last_activity = nowIso;
  bill.updated_at = nowIso;
  return bill;
}

export async function updatePlayerBillPhone(id: string, phone: string): Promise<PlayerBill | null> {
  const clean = phone.trim();
  const nowIso = new Date().toISOString();

  if (hasPostgres()) {
    try {
      const res = await sql.query(
        "UPDATE player_bills SET phone = $1, updated_at = $2 WHERE id = $3 RETURNING *;",
        [clean, nowIso, id]
      );
      if (res.rows.length > 0) {
        return mapPlayerBillRow(res.rows[0]);
      }
    } catch (e) {
      console.warn("Postgres updatePlayerBillPhone error:", e);
    }
  }

  const db = getDb();
  const bill = db.playerBills.find((b) => b.id === id);
  if (!bill) return null;
  bill.phone = clean;
  bill.updated_at = nowIso;
  saveDb(db);
  return bill;
}

/* ==========================================================================
   LOANS
   ========================================================================== */

export async function getLoans(filters?: {
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<Loan[]> {
  if (hasPostgres()) {
    try {
      let query = "SELECT * FROM loans WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (filters?.status && filters.status !== "all") {
        query += ` AND status = $${pIdx++}`;
        params.push(filters.status);
      }
      if (filters?.search) {
        query += ` AND (LOWER(customer_name) ILIKE $${pIdx} OR phone ILIKE $${pIdx})`;
        params.push(`%${filters.search.trim().toLowerCase()}%`);
        pIdx++;
      }
      if (filters?.fromDate) {
        query += ` AND date >= $${pIdx++}`;
        params.push(filters.fromDate);
      }
      if (filters?.toDate) {
        query += ` AND date <= $${pIdx++}`;
        params.push(filters.toDate);
      }

      query += " ORDER BY created_at DESC";
      const res = await sql.query(query, params);
      return res.rows.map(mapLoanRow);
    } catch (e) {
      console.warn("Postgres getLoans fallback to local JSON:", e);
    }
  }

  const db = getDb();
  let results = [...db.loans];

  if (filters?.status && filters.status !== "all") {
    results = results.filter((l) => l.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    results = results.filter(
      (l) =>
        l.customer_name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q)
    );
  }
  if (filters?.fromDate) {
    results = results.filter((l) => l.date >= (filters.fromDate as string));
  }
  if (filters?.toDate) {
    results = results.filter((l) => l.date <= (filters.toDate as string));
  }

  return results.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function addLoan(loan: Loan): Promise<Loan> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO loans (id, customer_name, phone, amount, paid, remaining, date, reason, status, employee_id, employee_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          loan.id, loan.customer_name, loan.phone || null, loan.amount, loan.paid,
          loan.remaining, loan.date, loan.reason || null, loan.status,
          loan.employee_id, loan.employee_name, loan.created_at || new Date().toISOString()
        ]
      );
    } catch (e) {
      console.warn("Postgres addLoan error:", e);
    }
  }

  const db = getDb();
  db.loans.unshift(loan);
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: loan.employee_id,
    actor_name: loan.employee_name,
    action: "loan_added",
    entity: "loan",
    entity_id: loan.id,
    details: `Added Loan of Rs. ${loan.amount} for ${loan.customer_name} (Reason: ${loan.reason})`,
    timestamp: new Date().toISOString(),
  });

  return loan;
}

export async function repayLoan(
  loanId: string,
  amount: number,
  actor: { id: string; name: string }
): Promise<Loan | null> {
  let updatedLoan: Loan | null = null;

  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM loans WHERE id = $1 LIMIT 1", [loanId]);
      if (res.rows.length > 0) {
        const cur = mapLoanRow(res.rows[0]);
        const newPaid = cur.paid + amount;
        const newRemaining = Math.max(0, cur.amount - newPaid);
        const newStatus = newRemaining === 0 ? "paid" : "partial";

        await sql.query(
          `UPDATE loans SET paid = $1, remaining = $2, status = $3 WHERE id = $4;`,
          [newPaid, newRemaining, newStatus, loanId]
        );

        updatedLoan = { ...cur, paid: newPaid, remaining: newRemaining, status: newStatus };
      }
    } catch (e) {
      console.warn("Postgres repayLoan error:", e);
    }
  }

  const db = getDb();
  const localLoan = db.loans.find((l) => l.id === loanId);
  if (localLoan) {
    localLoan.paid += amount;
    localLoan.remaining = Math.max(0, localLoan.amount - localLoan.paid);
    localLoan.status = localLoan.remaining === 0 ? "paid" : "partial";
    saveDb(db);
    if (!updatedLoan) updatedLoan = localLoan;
  }

  if (updatedLoan) {
    await logAudit({
      id: `audit-${Date.now()}`,
      actor_id: actor.id,
      actor_name: actor.name,
      action: "loan_repayment",
      entity: "loan",
      entity_id: loanId,
      details: `Recorded Loan Repayment of Rs. ${amount} for ${updatedLoan.customer_name}. Remaining: Rs. ${updatedLoan.remaining}`,
      timestamp: new Date().toISOString(),
    });
  }

  return updatedLoan;
}

export async function deleteLoan(id: string, actor: { id: string; name: string }): Promise<boolean> {
  let deletedAmount = 0;
  let customerName = "";

  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM loans WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        deletedAmount = Number(res.rows[0].amount || 0);
        customerName = res.rows[0].customer_name;
        await sql.query("DELETE FROM loans WHERE id = $1", [id]);
      }
    } catch (e) {
      console.warn("Postgres deleteLoan error:", e);
    }
  }

  const db = getDb();
  const idx = db.loans.findIndex((l) => l.id === id);
  if (idx >= 0) {
    const deleted = db.loans.splice(idx, 1)[0];
    deletedAmount = deletedAmount || deleted.amount;
    customerName = customerName || deleted.customer_name;
    saveDb(db);
  }

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "loan_deleted",
    entity: "loan",
    entity_id: id,
    details: `Deleted Loan of Rs. ${deletedAmount} for ${customerName}`,
    timestamp: new Date().toISOString(),
  });

  return true;
}

/* ==========================================================================
   EXPENSES & REVENUE
   ========================================================================== */

export async function getExpenses(filters?: {
  category?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<Expense[]> {
  if (hasPostgres()) {
    try {
      let query = "SELECT * FROM expenses WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (filters?.category && filters.category !== "all") {
        query += ` AND category = $${pIdx++}`;
        params.push(filters.category);
      }
      if (filters?.fromDate) {
        query += ` AND date >= $${pIdx++}`;
        params.push(filters.fromDate);
      }
      if (filters?.toDate) {
        query += ` AND date <= $${pIdx++}`;
        params.push(filters.toDate);
      }

      query += " ORDER BY created_at DESC";
      const res = await sql.query(query, params);
      return res.rows.map(mapExpenseRow);
    } catch (e) {
      console.warn("Postgres getExpenses fallback to local JSON:", e);
    }
  }

  const db = getDb();
  let results = [...db.expenses];

  if (filters?.category && filters.category !== "all") {
    results = results.filter((e) => e.category === filters.category);
  }
  if (filters?.fromDate) {
    results = results.filter((e) => e.date >= (filters.fromDate as string));
  }
  if (filters?.toDate) {
    results = results.filter((e) => e.date <= (filters.toDate as string));
  }

  return results.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function addExpense(expense: Expense): Promise<Expense> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO expenses (id, date, category, amount, note, employee_id, employee_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          expense.id, expense.date, expense.category, expense.amount,
          expense.note || null, expense.employee_id, expense.employee_name,
          expense.created_at || new Date().toISOString()
        ]
      );
    } catch (e) {
      console.warn("Postgres addExpense error:", e);
    }
  }

  const db = getDb();
  db.expenses.unshift(expense);
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: expense.employee_id,
    actor_name: expense.employee_name,
    action: "expense_added",
    entity: "expense",
    entity_id: expense.id,
    details: `Logged expense of Rs. ${expense.amount} under ${expense.category}: "${expense.note}"`,
    timestamp: new Date().toISOString(),
  });

  return expense;
}

export async function deleteExpense(id: string, actor: { id: string; name: string }): Promise<boolean> {
  let deletedAmount = 0;
  let category = "";

  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM expenses WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        deletedAmount = Number(res.rows[0].amount || 0);
        category = res.rows[0].category;
        await sql.query("DELETE FROM expenses WHERE id = $1", [id]);
      }
    } catch (e) {
      console.warn("Postgres deleteExpense error:", e);
    }
  }

  const db = getDb();
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx >= 0) {
    const deleted = db.expenses.splice(idx, 1)[0];
    deletedAmount = deletedAmount || deleted.amount;
    category = category || deleted.category;
    saveDb(db);
  }

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "expense_deleted",
    entity: "expense",
    entity_id: id,
    details: `Deleted expense of Rs. ${deletedAmount} (${category})`,
    timestamp: new Date().toISOString(),
  });

  return true;
}

export async function getRevenueEntries(): Promise<RevenueEntry[]> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM revenue_entries ORDER BY created_at DESC");
      return res.rows.map(mapRevenueRow);
    } catch (e) {
      console.warn("Postgres getRevenueEntries fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.revenue.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function addRevenueEntry(entry: RevenueEntry): Promise<RevenueEntry> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO revenue_entries (id, date, category, amount, payment_method, note, employee_id, employee_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          entry.id, entry.date, entry.category, entry.amount, entry.payment_method,
          entry.note || null, entry.employee_id, entry.employee_name,
          entry.created_at || new Date().toISOString()
        ]
      );
    } catch (e) {
      console.warn("Postgres addRevenueEntry error:", e);
    }
  }

  const db = getDb();
  db.revenue.unshift(entry);
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: entry.employee_id,
    actor_name: entry.employee_name,
    action: "revenue_added",
    entity: "revenue",
    entity_id: entry.id,
    details: `Logged revenue of Rs. ${entry.amount} under ${entry.category}: "${entry.note}"`,
    timestamp: new Date().toISOString(),
  });

  return entry;
}

/* ==========================================================================
   CAFÉ INVENTORY & ORDERS
   ========================================================================== */

export async function getCafeItems(): Promise<CafeItem[]> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM cafe_items ORDER BY name ASC");
      if (res.rows.length > 0) {
        return res.rows.map(mapCafeItemRow);
      }
    } catch (e) {
      console.warn("Postgres getCafeItems fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.cafeItems;
}

export async function saveCafeItem(item: CafeItem): Promise<CafeItem> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO cafe_items (id, name, category, purchase_price, sale_price, stock, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           purchase_price = EXCLUDED.purchase_price,
           sale_price = EXCLUDED.sale_price,
           stock = EXCLUDED.stock,
           active = EXCLUDED.active;`,
        [item.id, item.name, item.category, item.purchase_price, item.sale_price, item.stock, item.active]
      );
    } catch (e) {
      console.warn("Postgres saveCafeItem error:", e);
    }
  }

  const db = getDb();
  const idx = db.cafeItems.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    db.cafeItems[idx] = item;
  } else {
    db.cafeItems.push(item);
  }
  saveDb(db);
  return item;
}

export async function restockCafeItem(
  id: string,
  addStock: number,
  actor: { id: string; name: string }
): Promise<CafeItem | null> {
  let updatedItem: CafeItem | null = null;
  let prevStock = 0;

  if (hasPostgres()) {
    try {
      const curRes = await sql.query("SELECT * FROM cafe_items WHERE id = $1 LIMIT 1", [id]);
      if (curRes.rows.length > 0) {
        prevStock = Number(curRes.rows[0].stock || 0);
        const newStock = prevStock + addStock;
        await sql.query("UPDATE cafe_items SET stock = $1 WHERE id = $2;", [newStock, id]);
        updatedItem = { ...mapCafeItemRow(curRes.rows[0]), stock: newStock };
      }
    } catch (e) {
      console.warn("Postgres restockCafeItem error:", e);
    }
  }

  const db = getDb();
  const item = db.cafeItems.find((c) => c.id === id);
  if (item) {
    prevStock = prevStock || item.stock;
    item.stock += addStock;
    saveDb(db);
    if (!updatedItem) updatedItem = item;
  }

  if (updatedItem) {
    await logAudit({
      id: `audit-${Date.now()}`,
      actor_id: actor.id,
      actor_name: actor.name,
      action: "inventory_restock",
      entity: "cafe_item",
      entity_id: updatedItem.id,
      details: `Restocked ${updatedItem.name} (+${addStock}). Old: ${prevStock}, New: ${updatedItem.stock}`,
      timestamp: new Date().toISOString(),
    });
  }

  return updatedItem;
}

export async function deleteCafeItem(id: string): Promise<boolean> {
  if (hasPostgres()) {
    try {
      await sql.query("DELETE FROM cafe_items WHERE id = $1", [id]);
    } catch (e) {
      console.warn("Postgres deleteCafeItem error:", e);
    }
  }

  const db = getDb();
  const idx = db.cafeItems.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  db.cafeItems.splice(idx, 1);
  saveDb(db);
  return true;
}

export async function getCafeOrders(filters?: {
  date?: string;
  status?: string;
}): Promise<CafeOrder[]> {
  if (hasPostgres()) {
    try {
      let query = "SELECT * FROM cafe_orders WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (filters?.date) {
        query += ` AND date = $${pIdx++}`;
        params.push(filters.date);
      }
      if (filters?.status && filters.status !== "all") {
        query += ` AND status = $${pIdx++}`;
        params.push(filters.status);
      }

      query += " ORDER BY created_at DESC";
      const res = await sql.query(query, params);
      return res.rows.map(mapCafeOrderRow);
    } catch (e) {
      console.warn("Postgres getCafeOrders fallback to local JSON:", e);
    }
  }

  const db = getDb();
  let results = [...db.cafeOrders];

  if (filters?.date) {
    results = results.filter((o) => o.date === filters.date);
  }
  if (filters?.status && filters.status !== "all") {
    results = results.filter((o) => o.status === filters.status);
  }

  return results.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createCafeOrder(order: CafeOrder): Promise<CafeOrder> {
  const nowIso = new Date().toISOString();

  if (hasPostgres()) {
    try {
      // 1. Insert order
      await sql.query(
        `INSERT INTO cafe_orders (id, player_name_or_walkin, is_walkin, items, total, discount, net_total, payment_method, status, date, employee_id, employee_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          order.id, order.player_name_or_walkin, order.is_walkin, JSON.stringify(order.items),
          order.total, order.discount, order.net_total, order.payment_method, order.status,
          order.date, order.employee_id, order.employee_name, order.created_at || nowIso
        ]
      );

      // 2. Decrement inventory
      for (const itm of order.items) {
        await sql.query(
          "UPDATE cafe_items SET stock = GREATEST(0, stock - $1) WHERE id = $2;",
          [itm.quantity, itm.itemId]
        );
      }

      // 3. If billed to player, update or insert player bill
      if (!order.is_walkin && order.payment_method === "bill") {
        const billRes = await sql.query(
          "SELECT * FROM player_bills WHERE LOWER(player_name) = LOWER($1) LIMIT 1",
          [order.player_name_or_walkin]
        );
        if (billRes.rows.length === 0) {
          const newBillId = `bill-${Date.now()}`;
          await sql.query(
            `INSERT INTO player_bills (id, player_name, phone, game_ids, game_amount, cafe_amount, discount, paid, loan, balance, status, last_activity, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
            [
              newBillId, order.player_name_or_walkin, "", JSON.stringify([]), 0,
              order.net_total, 0, 0, 0, order.net_total, "pending", nowIso, nowIso, nowIso
            ]
          );
        } else {
          const cur = mapPlayerBillRow(billRes.rows[0]);
          await sql.query(
            `UPDATE player_bills SET
               cafe_amount = cafe_amount + $1,
               balance = balance + $1,
               status = 'pending',
               last_activity = $2,
               updated_at = $3
             WHERE id = $4;`,
            [order.net_total, nowIso, nowIso, cur.id]
          );
        }
      }
    } catch (e) {
      console.warn("Postgres createCafeOrder error:", e);
    }
  }

  // Local sync
  const db = getDb();
  db.cafeOrders.unshift(order);

  for (const itm of order.items) {
    const item = db.cafeItems.find((c) => c.id === itm.itemId);
    if (item) {
      item.stock = Math.max(0, item.stock - itm.quantity);
    }
  }

  if (!order.is_walkin && order.payment_method === "bill") {
    let bill = db.playerBills.find(
      (b) => b.player_name.toLowerCase() === order.player_name_or_walkin.toLowerCase()
    );
    if (!bill) {
      bill = {
        id: `bill-${Date.now()}`,
        player_name: order.player_name_or_walkin,
        phone: "",
        game_ids: [],
        game_amount: 0,
        cafe_amount: order.net_total,
        discount: 0,
        paid: 0,
        loan: 0,
        balance: order.net_total,
        status: "pending",
        last_activity: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      db.playerBills.push(bill);
    } else {
      bill.cafe_amount += order.net_total;
      bill.balance += order.net_total;
      bill.status = "pending";
      bill.last_activity = nowIso;
      bill.updated_at = nowIso;
    }
  }

  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: order.employee_id,
    actor_name: order.employee_name,
    action: "cafe_order_created",
    entity: "cafe_order",
    entity_id: order.id,
    details: `Placed Café Order for ${order.player_name_or_walkin} (Total: Rs. ${order.net_total}, Method: ${order.payment_method})`,
    timestamp: nowIso,
  });

  return order;
}

/* ==========================================================================
   VOID REQUESTS
   ========================================================================== */

export async function getVoidRequests(): Promise<VoidRequest[]> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM void_requests ORDER BY created_at DESC");
      return res.rows.map(mapVoidRequestRow);
    } catch (e) {
      console.warn("Postgres getVoidRequests fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.voidRequests.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createVoidRequest(req: VoidRequest): Promise<VoidRequest> {
  const nowIso = new Date().toISOString();
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO void_requests (id, game_id, table_name, amount, reason, requested_by_id, requested_by_name, status, reviewed_by_name, reviewed_at, admin_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          req.id, req.game_id, req.table_name, req.amount, req.reason,
          req.requested_by_id, req.requested_by_name, req.status,
          req.reviewed_by_name || null, req.reviewed_at || null, req.admin_notes || null,
          req.created_at || nowIso
        ]
      );
    } catch (e) {
      console.warn("Postgres createVoidRequest error:", e);
    }
  }

  const db = getDb();
  db.voidRequests.unshift(req);
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: req.requested_by_id,
    actor_name: req.requested_by_name,
    action: "void_requested",
    entity: "game",
    entity_id: req.game_id,
    details: `Submitted Void Request for Game on ${req.table_name}: "${req.reason}"`,
    timestamp: nowIso,
  });

  return req;
}

export async function resolveVoidRequest(
  id: string,
  decision: "approved" | "rejected",
  adminNotes: string,
  reviewer: { id: string; name: string }
): Promise<VoidRequest | null> {
  const nowIso = new Date().toISOString();
  let updatedReq: VoidRequest | null = null;

  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM void_requests WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length > 0) {
        const cur = mapVoidRequestRow(res.rows[0]);
        await sql.query(
          `UPDATE void_requests SET
             status = $1,
             reviewed_by_name = $2,
             reviewed_at = $3,
             admin_notes = $4
           WHERE id = $5;`,
          [decision, reviewer.name, nowIso, adminNotes, id]
        );

        if (decision === "approved") {
          const gameRes = await sql.query("SELECT * FROM games WHERE id = $1 LIMIT 1", [cur.game_id]);
          if (gameRes.rows.length > 0) {
            const game = mapGameRow(gameRes.rows[0]);
            await sql.query("UPDATE games SET status = 'cancelled' WHERE id = $1;", [game.id]);
            await appKv.del(`table:live:${game.table_id}`);

            const targetPlayer = game.loser || game.players[0];
            if (targetPlayer) {
              await sql.query(
                `UPDATE player_bills SET
                   game_amount = GREATEST(0, game_amount - $1),
                   balance = GREATEST(0, balance - $1),
                   status = CASE WHEN GREATEST(0, balance - $1) = 0 THEN 'cleared' ELSE status END
                 WHERE LOWER(player_name) = LOWER($2);`,
                [game.amount, targetPlayer]
              );
            }
          }
        }

        updatedReq = {
          ...cur,
          status: decision,
          reviewed_by_name: reviewer.name,
          reviewed_at: nowIso,
          admin_notes: adminNotes,
        };
      }
    } catch (e) {
      console.warn("Postgres resolveVoidRequest error:", e);
    }
  }

  // Local sync
  const db = getDb();
  const req = db.voidRequests.find((v) => v.id === id);
  if (req) {
    req.status = decision;
    req.reviewed_by_name = reviewer.name;
    req.reviewed_at = nowIso;
    req.admin_notes = adminNotes;

    if (decision === "approved") {
      const game = db.games.find((g) => g.id === req.game_id);
      if (game) {
        game.status = "cancelled";
        await appKv.del(`table:live:${game.table_id}`);

        const targetPlayer = game.loser || game.players[0];
        if (targetPlayer) {
          const bill = db.playerBills.find(
            (b) => b.player_name.toLowerCase() === targetPlayer.toLowerCase()
          );
          if (bill) {
            bill.game_amount = Math.max(0, bill.game_amount - game.amount);
            bill.balance = Math.max(0, bill.balance - game.amount);
            if (bill.balance === 0) bill.status = "cleared";
          }
        }
      }
    }
    saveDb(db);
    if (!updatedReq) updatedReq = req;
  }

  if (updatedReq) {
    await logAudit({
      id: `audit-${Date.now()}`,
      actor_id: reviewer.id,
      actor_name: reviewer.name,
      action: decision === "approved" ? "void_approved" : "void_rejected",
      entity: "void_request",
      entity_id: updatedReq.id,
      details: `${decision === "approved" ? "APPROVED" : "REJECTED"} Void Request for game on ${updatedReq.table_name} (${adminNotes || "No notes"})`,
      timestamp: nowIso,
    });
  }

  return updatedReq;
}

/* ==========================================================================
   AUDIT LOGS
   ========================================================================== */

export async function getAuditLogs(filters?: {
  search?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  if (hasPostgres()) {
    try {
      let query = "SELECT * FROM audit_log WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (filters?.action && filters.action !== "all") {
        query += ` AND action = $${pIdx++}`;
        params.push(filters.action);
      }
      if (filters?.search) {
        query += ` AND (actor_name ILIKE $${pIdx} OR details ILIKE $${pIdx} OR entity ILIKE $${pIdx})`;
        params.push(`%${filters.search.trim()}%`);
        pIdx++;
      }

      query += " ORDER BY timestamp DESC";
      if (filters?.limit) {
        query += ` LIMIT $${pIdx++}`;
        params.push(filters.limit);
      } else {
        query += " LIMIT 200";
      }

      const res = await sql.query(query, params);
      return res.rows.map(mapAuditLogRow);
    } catch (e) {
      console.warn("Postgres getAuditLogs fallback to local JSON:", e);
    }
  }

  const db = getDb();
  let results = [...db.auditLogs];

  if (filters?.action && filters.action !== "all") {
    results = results.filter((a) => a.action === filters.action);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    results = results.filter(
      (a) =>
        a.actor_name.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q) ||
        a.entity.toLowerCase().includes(q)
    );
  }

  results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (filters?.limit) {
    return results.slice(0, filters.limit);
  }
  return results;
}

export async function logAudit(entry: AuditLog): Promise<void> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO audit_log (id, actor_id, actor_name, action, entity, entity_id, details, before, after, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [
          entry.id, entry.actor_id, entry.actor_name, entry.action, entry.entity,
          entry.entity_id, entry.details, entry.before ? JSON.stringify(entry.before) : null,
          entry.after ? JSON.stringify(entry.after) : null, entry.timestamp || new Date().toISOString()
        ]
      );
    } catch (e) {
      console.warn("Postgres logAudit error:", e);
    }
  }

  const db = getDb();
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  saveDb(db);
}

/* ==========================================================================
   SETTINGS & CASH COLLECT
   ========================================================================== */

export async function getSettings(): Promise<ClubSettings> {
  if (hasPostgres()) {
    try {
      const res = await sql.query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
      if (res.rows.length > 0) {
        return mapSettingsRow(res.rows[0]);
      }
    } catch (e) {
      console.warn("Postgres getSettings fallback to local JSON:", e);
    }
  }
  const db = getDb();
  return db.settings;
}

export async function updateSettings(settings: ClubSettings): Promise<ClubSettings> {
  if (hasPostgres()) {
    try {
      await sql.query(
        `INSERT INTO settings (id, club_name, phone, address, currency, table_count, century_rate_per_min, receipt_footer, last_cash_collection)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           club_name = EXCLUDED.club_name,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           currency = EXCLUDED.currency,
           table_count = EXCLUDED.table_count,
           century_rate_per_min = EXCLUDED.century_rate_per_min,
           receipt_footer = EXCLUDED.receipt_footer,
           last_cash_collection = EXCLUDED.last_cash_collection;`,
        [
          settings.club_name, settings.phone || null, settings.address || null,
          settings.currency || "Rs.", settings.table_count || 6,
          settings.century_rate_per_min || 6, settings.receipt_footer || null,
          settings.last_cash_collection ? JSON.stringify(settings.last_cash_collection) : null
        ]
      );
    } catch (e) {
      console.warn("Postgres updateSettings error:", e);
    }
  }

  const db = getDb();
  db.settings = settings;
  saveDb(db);
  return settings;
}

export async function collectCash(
  amount: number,
  actor: { id: string; name: string }
): Promise<{ collected_at: string; amount: number; collected_by: string }> {
  const nowIso = new Date().toISOString();
  const record = {
    collected_at: nowIso,
    collected_by: actor.name,
    amount,
  };

  if (hasPostgres()) {
    try {
      await sql.query(
        "UPDATE settings SET last_cash_collection = $1 WHERE id = 1;",
        [JSON.stringify(record)]
      );
      await sql.query(
        "UPDATE cafe_orders SET status = 'collected' WHERE payment_method = 'cash' AND status = 'completed';"
      );
    } catch (e) {
      console.warn("Postgres collectCash error:", e);
    }
  }

  const db = getDb();
  db.settings.last_cash_collection = record;
  db.cafeOrders.forEach((o) => {
    if (o.payment_method === "cash" && o.status === "completed") {
      o.status = "collected";
    }
  });
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "cash_collect",
    entity: "settings",
    entity_id: "cash_drawer",
    details: `Owner/Admin Cash Collect executed: Total Rs. ${amount} collected from drawer`,
    timestamp: nowIso,
  });

  return record;
}

/* ==========================================================================
   ANALYTICS & KPI ROLLUPS
   ========================================================================== */

export async function getDashboardStats(selectedDate?: string) {
  const dateStr = selectedDate || new Date().toISOString().split("T")[0];

  // Fetch live tables and settings
  const [tables, settings, allGames, dateOrders, allLoans, dateExpenses, playerBills] =
    await Promise.all([
      getTables(),
      getSettings(),
      getGames(),
      getCafeOrders({ date: dateStr }),
      getLoans(),
      getExpenses({ fromDate: dateStr, toDate: dateStr }),
      getPlayerBills(),
    ]);

  const dateGames = allGames.filter((g) => g.start_time.split("T")[0] === dateStr);
  const activeNowCount = allGames.filter((g) => g.status === "live").length;
  const freeGamesCount = dateGames.filter(
    (g) => g.payment_method === "free" || (g.amount === 0 && g.status === "completed")
  ).length;

  let cashSale = 0;
  let onlineSale = 0;
  let gameSale = 0;
  let gamePending = 0;
  let discountTotal = 0;

  for (const g of dateGames) {
    if (g.status === "completed") {
      gameSale += g.amount;
      cashSale += g.cash_amount;
      onlineSale += g.online_amount;
      discountTotal += g.discount;
      if (g.payment_method === "pending") {
        gamePending += g.amount;
      }
    }
  }

  // Café calculations
  let cafeSale = 0;
  let cafePending = 0;
  for (const o of dateOrders) {
    cafeSale += o.net_total;
    if (o.payment_method === "bill") {
      cafePending += o.net_total;
    } else if (o.payment_method === "cash") {
      cashSale += o.net_total;
    } else if (o.payment_method === "online") {
      onlineSale += o.net_total;
    }
  }

  // Loans calculations
  let loanBalance = 0;
  let loanRecovered = 0;
  for (const l of allLoans) {
    loanBalance += l.remaining;
    if (l.date === dateStr) {
      loanRecovered += l.paid;
    }
  }

  // Expenses calculations
  let expensesTotal = 0;
  for (const e of dateExpenses) {
    expensesTotal += e.amount;
  }

  const totalSale = gameSale + cafeSale;

  // Revenue by Game/Table
  const revenueByTable: Record<string, number> = {};
  for (const t of tables) {
    revenueByTable[t.name] = 0;
  }
  for (const g of dateGames) {
    if (g.status === "completed") {
      revenueByTable[g.table_name] = (revenueByTable[g.table_name] || 0) + g.amount;
    }
  }

  // Games by Hour of Day (0 to 23)
  const gamesByHour: Record<number, number> = {};
  for (let h = 10; h <= 23; h++) {
    gamesByHour[h] = 0;
  }
  for (const g of dateGames) {
    const hr = new Date(g.start_time).getHours();
    gamesByHour[hr] = (gamesByHour[hr] || 0) + 1;
  }

  // Top Players
  const playerGameCounts: Record<string, number> = {};
  for (const g of allGames) {
    for (const p of g.players) {
      playerGameCounts[p] = (playerGameCounts[p] || 0) + 1;
    }
  }
  const topPlayers = Object.entries(playerGameCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Breakdown by Employee
  const employeeBreakdown: Record<
    string,
    { name: string; games: number; revenue: number }
  > = {};
  for (const g of dateGames) {
    if (!employeeBreakdown[g.employee_id]) {
      employeeBreakdown[g.employee_id] = {
        name: g.employee_name,
        games: 0,
        revenue: 0,
      };
    }
    employeeBreakdown[g.employee_id].games += 1;
    if (g.status === "completed") {
      employeeBreakdown[g.employee_id].revenue += g.amount;
    }
  }

  // Pending Player Bills
  const pendingBills = playerBills
    .filter((b) => b.status === "pending" && b.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6);

  return {
    kpis: {
      gamesCount: dateGames.length,
      activeNow: activeNowCount,
      freeGames: freeGamesCount,
      cash: cashSale,
      online: onlineSale,
      gameSale,
      gamePending,
      cafeSale,
      cafePending,
      loanBalance,
      loanRecovered,
      expenses: expensesTotal,
      discount: discountTotal,
      totalSale,
    },
    revenueByTable: Object.entries(revenueByTable).map(([table, revenue]) => ({
      table: table.split(" — ")[0],
      fullName: table,
      revenue,
    })),
    gamesByHour: Object.entries(gamesByHour).map(([hour, count]) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      count,
    })),
    topPlayers,
    byEmployee: Object.values(employeeBreakdown),
    pendingBills,
    cafeSummary: {
      totalOrders: dateOrders.length,
      collected: cafeSale - cafePending,
      pending: cafePending,
    },
    tables,
    currency: settings.currency,
  };
}

export async function getEmployeeSummary(employeeId: string, dateStr?: string) {
  const date = dateStr || new Date().toISOString().split("T")[0];

  const [allGames, shiftOrders, shiftExpenses, shiftLoans, settings] = await Promise.all([
    getGames({ employeeId }),
    getCafeOrders({ date }),
    getExpenses({ fromDate: date, toDate: date }),
    getLoans({ fromDate: date, toDate: date }),
    getSettings(),
  ]);

  const shiftGames = allGames.filter(
    (g) => g.start_time.split("T")[0] === date
  );

  let totalRevenue = 0;
  let completedGames = 0;
  let activeGames = 0;

  for (const g of shiftGames) {
    if (g.status === "completed") {
      completedGames++;
      totalRevenue += g.amount;
    } else if (g.status === "live") {
      activeGames++;
    }
  }

  const employeeOrders = shiftOrders.filter((o) => o.employee_id === employeeId);
  let cafeRevenue = 0;
  for (const o of employeeOrders) {
    cafeRevenue += o.net_total;
  }

  const employeeExpenses = shiftExpenses.filter((e) => e.employee_id === employeeId);
  let expensesTotal = 0;
  for (const e of employeeExpenses) {
    expensesTotal += e.amount;
  }

  const employeeLoans = shiftLoans.filter((l) => l.employee_id === employeeId);

  return {
    date,
    gamesHandled: shiftGames.length,
    completedGames,
    activeGames,
    totalGameRevenue: totalRevenue,
    cafeOrdersCount: employeeOrders.length,
    cafeRevenue,
    expensesLogged: expensesTotal,
    loansLogged: employeeLoans.length,
    currency: settings.currency,
  };
}
