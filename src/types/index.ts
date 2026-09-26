export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  pin_hash: string;
  active: boolean;
  created_at: string;
}

export interface TableRates {
  ball15: number;
  ball10: number;
  ball6: number;
  centuryPerMin: number;
  hourlyRate?: number;
}

export interface ClubTable {
  id: string;
  table_number: number;
  name: string;
  brand: string;
  rates: TableRates;
  active: boolean;
}

export type GameType = "single" | "double" | "century" | "final";
export type GameStatus = "live" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "online" | "split" | "pending" | "free";

export interface Game {
  id: string;
  table_id: string;
  table_name: string;
  type: GameType;
  ball_count: string;
  rate: number;
  players: string[];
  loser: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  status: GameStatus;
  payment_method: PaymentMethod;
  amount: number;
  cash_amount: number;
  online_amount: number;
  discount: number;
  employee_id: string;
  employee_name: string;
  notes?: string | null;
  created_at: string;
}

export interface PlayerBill {
  id: string;
  player_name: string;
  phone: string;
  game_ids: string[];
  game_amount: number;
  cafe_amount: number;
  discount: number;
  paid: number;
  loan: number;
  balance: number;
  status: "pending" | "cleared";
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  customer_name: string;
  phone: string;
  amount: number;
  paid: number;
  remaining: number;
  date: string;
  reason: string;
  status: "outstanding" | "partial" | "paid";
  employee_id: string;
  employee_name: string;
  created_at: string;
}

export type ExpenseCategory =
  | "Electricity"
  | "Rent"
  | "Maintenance & Cloth"
  | "Staff Food"
  | "Salaries"
  | "Misc";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
  employee_id: string;
  employee_name: string;
  created_at: string;
}

export interface RevenueEntry {
  id: string;
  date: string;
  category: "Tournament Fee" | "Cue Locker Rent" | "Membership" | "Misc Revenue";
  amount: number;
  payment_method: "cash" | "online";
  note: string;
  employee_id: string;
  employee_name: string;
  created_at: string;
}

export type CafeCategory =
  | "Beverages"
  | "Hot Drinks"
  | "Snacks"
  | "Cigarettes"
  | "Fast Food";

export interface CafeItem {
  id: string;
  name: string;
  category: CafeCategory;
  purchase_price: number;
  sale_price: number;
  stock: number;
  active: boolean;
}

export interface CafeOrderItem {
  itemId: string;
  name: string;
  category: CafeCategory;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CafeOrder {
  id: string;
  player_name_or_walkin: string;
  is_walkin: boolean;
  items: CafeOrderItem[];
  total: number;
  discount: number;
  net_total: number;
  payment_method: "cash" | "online" | "bill";
  status: "completed" | "pending" | "collected";
  date: string;
  employee_id: string;
  employee_name: string;
  created_at: string;
}

export interface VoidRequest {
  id: string;
  game_id: string;
  table_name: string;
  amount: number;
  reason: string;
  requested_by_id: string;
  requested_by_name: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  timestamp: string;
}

export interface ClubSettings {
  club_name: string;
  phone: string;
  address: string;
  currency: string;
  table_count: number;
  century_rate_per_min: number;
  receipt_footer: string;
  last_cash_collection?: {
    collected_at: string;
    collected_by: string;
    amount: number;
  } | null;
}
