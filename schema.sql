-- Snooker Club Management System - Vercel Postgres / PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'employee')),
  pin_hash VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
  id VARCHAR(64) PRIMARY KEY,
  table_number INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  rates JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(64) PRIMARY KEY,
  table_id VARCHAR(64) REFERENCES tables(id),
  table_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('single', 'double', 'century', 'final')),
  ball_count VARCHAR(100) NOT NULL,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  players JSONB NOT NULL,
  loser VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('live', 'completed', 'cancelled')),
  payment_method VARCHAR(50),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  online_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  employee_id VARCHAR(64),
  employee_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_bills (
  id VARCHAR(64) PRIMARY KEY,
  player_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  game_ids JSONB DEFAULT '[]'::jsonb,
  game_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cafe_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  loan NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'cleared')),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(64) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  amount NUMERIC(10, 2) NOT NULL,
  paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remaining NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('outstanding', 'partial', 'paid')),
  employee_id VARCHAR(64),
  employee_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  note TEXT,
  employee_id VARCHAR(64),
  employee_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id VARCHAR(64) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  note TEXT,
  employee_id VARCHAR(64),
  employee_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cafe_items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  purchase_price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cafe_orders (
  id VARCHAR(64) PRIMARY KEY,
  player_name_or_walkin VARCHAR(255) NOT NULL,
  is_walkin BOOLEAN NOT NULL DEFAULT false,
  items JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_total NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  employee_id VARCHAR(64),
  employee_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS void_requests (
  id VARCHAR(64) PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  requested_by_id VARCHAR(64) NOT NULL,
  requested_by_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_name VARCHAR(255),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  before JSONB,
  after JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  club_name VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  address TEXT,
  currency VARCHAR(20) NOT NULL DEFAULT 'Rs.',
  table_count INT NOT NULL DEFAULT 6,
  century_rate_per_min NUMERIC(10, 2) NOT NULL DEFAULT 6,
  receipt_footer TEXT,
  last_cash_collection JSONB
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time);
CREATE INDEX IF NOT EXISTS idx_games_table_id ON games(table_id);
CREATE INDEX IF NOT EXISTS idx_player_bills_status ON player_bills(status);
CREATE INDEX IF NOT EXISTS idx_player_bills_name ON player_bills(player_name);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
