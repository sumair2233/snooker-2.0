import fs from "fs";
import path from "path";
import {
  User,
  ClubTable,
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
      const parsed = JSON.parse(content);
      return parsed;
    }
  } catch (err) {
    console.error("Error reading database file, resetting to initial seed:", err);
  }

  // Write initial seed
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
   USERS
   ========================================================================== */

export async function getUsers(): Promise<User[]> {
  const db = getDb();
  return db.users;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = getDb();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  return user || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const user = db.users.find((u) => u.id === id);
  return user || null;
}

export async function saveUser(user: User): Promise<User> {
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
  const db = getDb();
  return db.tables.sort((a, b) => a.table_number - b.table_number);
}

export async function getTableById(id: string): Promise<ClubTable | null> {
  const db = getDb();
  return db.tables.find((t) => t.id === id) || null;
}

export async function saveTable(table: ClubTable): Promise<ClubTable> {
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
  const db = getDb();
  const tables = db.tables;
  const activeGames: Record<string, Game> = {};

  // Try checking KV first for ultra-fast response
  for (const table of tables) {
    const liveGame = await appKv.get<Game>(`table:live:${table.id}`);
    if (liveGame && liveGame.status === "live") {
      activeGames[table.id] = liveGame;
    }
  }

  // Ensure DB live games are synchronized with KV
  const dbLiveGames = db.games.filter((g) => g.status === "live");
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
  const db = getDb();
  return db.games.find((g) => g.id === id) || null;
}

export async function startGame(newGame: Game): Promise<Game> {
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
  const db = getDb();
  const game = db.games.find((g) => g.id === gameId);
  if (!game) return null;

  const now = new Date();
  const startTime = new Date(game.start_time);
  const durationMinutes = Math.max(
    1,
    Math.round((now.getTime() - startTime.getTime()) / 60000)
  );

  let finalAmount = params.amount ?? game.rate;
  if (game.type === "century") {
    // Computed based on elapsed minutes if not explicitly overridden
    finalAmount = params.amount ?? durationMinutes * game.rate;
  }

  const discount = params.discount || 0;
  const netAmount = Math.max(0, finalAmount - discount);

  game.status = "completed";
  game.end_time = now.toISOString();
  game.duration_minutes = durationMinutes;
  game.loser = params.loser || null;
  game.payment_method = params.payment_method;
  game.amount = netAmount;
  game.discount = discount;
  game.cash_amount = params.cash_amount || (params.payment_method === "cash" ? netAmount : 0);
  game.online_amount = params.online_amount || (params.payment_method === "online" ? netAmount : 0);
  if (params.notes) game.notes = params.notes;

  // Clear live state from Vercel KV
  await appKv.del(`table:live:${game.table_id}`);

  // If pending or attached to a player, update or create Player Bill
  const targetPlayer = game.loser || game.players[0];
  if (targetPlayer) {
    let bill = db.playerBills.find(
      (b) => b.player_name.toLowerCase() === targetPlayer.toLowerCase()
    );
    if (!bill) {
      bill = {
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
      db.playerBills.push(bill);
    } else {
      bill.game_ids.push(game.id);
      bill.game_amount += netAmount;
      if (params.payment_method === "pending") {
        bill.balance += netAmount;
        bill.status = "pending";
      } else {
        bill.paid += netAmount;
      }
      bill.last_activity = now.toISOString();
      bill.updated_at = now.toISOString();
    }
  }

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
  const db = getDb();
  const bill = db.playerBills.find((b) => b.id === billId);
  if (!bill) return null;

  const now = new Date();
  const discount = data.discount || 0;
  bill.discount += discount;

  const previousBalance = bill.balance;
  bill.paid += data.paidAmount;
  let remaining = Math.max(0, previousBalance - data.paidAmount - discount);

  if (data.convertToLoan && remaining > 0) {
    // Create loan record
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
    db.loans.unshift(loanRecord);
    bill.loan += remaining;
    remaining = 0;
  }

  bill.balance = remaining;
  bill.status = remaining === 0 ? "cleared" : "pending";
  bill.last_activity = now.toISOString();
  bill.updated_at = now.toISOString();

  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: data.employee_id,
    actor_name: data.employee_name,
    action: "bill_checkout",
    entity: "bill",
    entity_id: bill.id,
    details: `Checkout for ${bill.player_name}: Paid Rs. ${data.paidAmount} (${data.paymentMethod})${
      data.convertToLoan ? `, converted Rs. ${bill.loan} to Loan` : ""
    }. New Balance: Rs. ${bill.balance}`,
    timestamp: now.toISOString(),
  });

  return bill;
}

export async function updatePlayerBillPhone(id: string, phone: string): Promise<PlayerBill | null> {
  const db = getDb();
  const bill = db.playerBills.find((b) => b.id === id);
  if (!bill) return null;
  bill.phone = phone.trim();
  bill.updated_at = new Date().toISOString();
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
  const db = getDb();
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) return null;

  loan.paid += amount;
  loan.remaining = Math.max(0, loan.amount - loan.paid);
  loan.status = loan.remaining === 0 ? "paid" : "partial";
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "loan_repayment",
    entity: "loan",
    entity_id: loan.id,
    details: `Recorded Loan Repayment of Rs. ${amount} for ${loan.customer_name}. Remaining: Rs. ${loan.remaining}`,
    timestamp: new Date().toISOString(),
  });

  return loan;
}

export async function deleteLoan(id: string, actor: { id: string; name: string }): Promise<boolean> {
  const db = getDb();
  const idx = db.loans.findIndex((l) => l.id === id);
  if (idx < 0) return false;

  const deleted = db.loans.splice(idx, 1)[0];
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "loan_deleted",
    entity: "loan",
    entity_id: id,
    details: `Deleted Loan of Rs. ${deleted.amount} for ${deleted.customer_name}`,
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
  const db = getDb();
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx < 0) return false;

  const deleted = db.expenses.splice(idx, 1)[0];
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "expense_deleted",
    entity: "expense",
    entity_id: id,
    details: `Deleted expense of Rs. ${deleted.amount} (${deleted.category})`,
    timestamp: new Date().toISOString(),
  });

  return true;
}

export async function getRevenueEntries(): Promise<RevenueEntry[]> {
  const db = getDb();
  return db.revenue.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function addRevenueEntry(entry: RevenueEntry): Promise<RevenueEntry> {
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
  const db = getDb();
  return db.cafeItems;
}

export async function saveCafeItem(item: CafeItem): Promise<CafeItem> {
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
  const db = getDb();
  const item = db.cafeItems.find((c) => c.id === id);
  if (!item) return null;

  const prev = item.stock;
  item.stock += addStock;
  saveDb(db);

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: actor.id,
    actor_name: actor.name,
    action: "inventory_restock",
    entity: "cafe_item",
    entity_id: item.id,
    details: `Restocked ${item.name} (+${addStock}). Old: ${prev}, New: ${item.stock}`,
    timestamp: new Date().toISOString(),
  });

  return item;
}

export async function deleteCafeItem(id: string): Promise<boolean> {
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
  const db = getDb();
  db.cafeOrders.unshift(order);

  // Decrement item inventory stock
  for (const itm of order.items) {
    const item = db.cafeItems.find((c) => c.id === itm.itemId);
    if (item) {
      item.stock = Math.max(0, item.stock - itm.quantity);
    }
  }

  // If order is linked to a player bill, update player bill
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
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.playerBills.push(bill);
    } else {
      bill.cafe_amount += order.net_total;
      bill.balance += order.net_total;
      bill.status = "pending";
      bill.last_activity = new Date().toISOString();
      bill.updated_at = new Date().toISOString();
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
    timestamp: new Date().toISOString(),
  });

  return order;
}

/* ==========================================================================
   VOID REQUESTS
   ========================================================================== */

export async function getVoidRequests(): Promise<VoidRequest[]> {
  const db = getDb();
  return db.voidRequests.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createVoidRequest(req: VoidRequest): Promise<VoidRequest> {
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
    timestamp: new Date().toISOString(),
  });

  return req;
}

export async function resolveVoidRequest(
  id: string,
  decision: "approved" | "rejected",
  adminNotes: string,
  reviewer: { id: string; name: string }
): Promise<VoidRequest | null> {
  const db = getDb();
  const req = db.voidRequests.find((v) => v.id === id);
  if (!req) return null;

  req.status = decision;
  req.reviewed_by_name = reviewer.name;
  req.reviewed_at = new Date().toISOString();
  req.admin_notes = adminNotes;

  if (decision === "approved") {
    // Reverse game impact
    const game = db.games.find((g) => g.id === req.game_id);
    if (game) {
      game.status = "cancelled";
      // Clear live state if it was live
      await appKv.del(`table:live:${game.table_id}`);

      // Adjust player bill if it was billed
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

  await logAudit({
    id: `audit-${Date.now()}`,
    actor_id: reviewer.id,
    actor_name: reviewer.name,
    action: decision === "approved" ? "void_approved" : "void_rejected",
    entity: "void_request",
    entity_id: req.id,
    details: `${decision === "approved" ? "APPROVED" : "REJECTED"} Void Request for game on ${req.table_name} (${adminNotes || "No notes"})`,
    timestamp: new Date().toISOString(),
  });

  return req;
}

/* ==========================================================================
   AUDIT LOGS
   ========================================================================== */

export async function getAuditLogs(filters?: {
  search?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLog[]> {
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
  const db = getDb();
  db.auditLogs.unshift(entry);
  // Cap at 1000 items to prevent unbounded file growth
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  saveDb(db);
}

/* ==========================================================================
   SETTINGS & CASH COLLECT
   ========================================================================== */

export async function getSettings(): Promise<ClubSettings> {
  const db = getDb();
  return db.settings;
}

export async function updateSettings(settings: ClubSettings): Promise<ClubSettings> {
  const db = getDb();
  db.settings = settings;
  saveDb(db);
  return settings;
}

export async function collectCash(
  amount: number,
  actor: { id: string; name: string }
): Promise<{ collected_at: string; amount: number; collected_by: string }> {
  const db = getDb();
  const record = {
    collected_at: new Date().toISOString(),
    collected_by: actor.name,
    amount,
  };
  db.settings.last_cash_collection = record;

  // Mark pending completed cafe orders as collected
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
    timestamp: new Date().toISOString(),
  });

  return record;
}

/* ==========================================================================
   ANALYTICS & KPI ROLLUPS
   ========================================================================== */

export async function getDashboardStats(selectedDate?: string) {
  const db = getDb();
  const dateStr = selectedDate || new Date().toISOString().split("T")[0];

  const dateGames = db.games.filter((g) => g.start_time.split("T")[0] === dateStr);
  const activeNowCount = db.games.filter((g) => g.status === "live").length;
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
  const dateOrders = db.cafeOrders.filter((o) => o.date === dateStr);
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
  for (const l of db.loans) {
    loanBalance += l.remaining;
    if (l.date === dateStr) {
      loanRecovered += l.paid;
    }
  }

  // Expenses calculations
  const dateExpenses = db.expenses.filter((e) => e.date === dateStr);
  let expensesTotal = 0;
  for (const e of dateExpenses) {
    expensesTotal += e.amount;
  }

  const totalSale = gameSale + cafeSale;

  // Revenue by Game/Table
  const revenueByTable: Record<string, number> = {};
  for (const t of db.tables) {
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
  for (const g of db.games) {
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
  const pendingBills = db.playerBills
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
    tables: db.tables,
    currency: db.settings.currency,
  };
}

export async function getEmployeeSummary(employeeId: string, dateStr?: string) {
  const db = getDb();
  const date = dateStr || new Date().toISOString().split("T")[0];

  const shiftGames = db.games.filter(
    (g) => g.employee_id === employeeId && g.start_time.split("T")[0] === date
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

  const shiftOrders = db.cafeOrders.filter(
    (o) => o.employee_id === employeeId && o.date === date
  );
  let cafeRevenue = 0;
  for (const o of shiftOrders) {
    cafeRevenue += o.net_total;
  }

  const shiftExpenses = db.expenses.filter(
    (e) => e.employee_id === employeeId && e.date === date
  );
  let expensesTotal = 0;
  for (const e of shiftExpenses) {
    expensesTotal += e.amount;
  }

  const shiftLoans = db.loans.filter(
    (l) => l.employee_id === employeeId && l.date === date
  );

  return {
    date,
    gamesHandled: shiftGames.length,
    completedGames,
    activeGames,
    totalGameRevenue: totalRevenue,
    cafeOrdersCount: shiftOrders.length,
    cafeRevenue,
    expensesLogged: expensesTotal,
    loansLogged: shiftLoans.length,
    currency: db.settings.currency,
  };
}
