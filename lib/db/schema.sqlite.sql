-- ==========================================
-- 收银与库存管理系统 - 本地 SQLite 初始化脚本
-- 由 schema.sql (PostgreSQL) 翻译
-- ==========================================
-- 主键统一为 TEXT (uuid 字符串，由应用层生成)
-- 数值统一为 REAL；时间戳统一为 ISO-8601 字符串

-- ==========================================
-- 商品与库存
-- ==========================================

CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  barcode         TEXT,
  sku             TEXT,
  category        TEXT,
  image_url       TEXT,
  unit            TEXT DEFAULT '件',

  cost_price      REAL DEFAULT 0,
  retail_price    REAL DEFAULT 0,
  wholesale_price REAL DEFAULT 0,

  stock_quantity  REAL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,

  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id                TEXT PRIMARY KEY,
  name              TEXT,
  phone             TEXT UNIQUE,
  region            TEXT,
  address           TEXT,

  member_level      TEXT DEFAULT 'bronze',
  points            INTEGER DEFAULT 0,

  total_spent       REAL DEFAULT 0,
  purchase_count    INTEGER DEFAULT 0,
  last_purchase_at  TEXT,

  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ==========================================
-- 销售订单
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  customer_id      TEXT REFERENCES customers(id),
  type             TEXT CHECK (type IN ('retail', 'wholesale')),
  status           TEXT DEFAULT 'completed',

  total_amount     REAL NOT NULL,
  discount_amount  REAL DEFAULT 0,
  payment_method   TEXT,

  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id              TEXT PRIMARY KEY,
  order_id        TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id      TEXT REFERENCES products(id),

  quantity        REAL NOT NULL,
  price_at_sale   REAL NOT NULL,
  original_price  REAL,
  cost_at_sale    REAL,

  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ==========================================
-- 进货 / 出库
-- ==========================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              TEXT PRIMARY KEY,
  supplier_id     TEXT REFERENCES suppliers(id),
  type            TEXT DEFAULT 'inbound' CHECK (type IN ('inbound', 'outbound')),
  status          TEXT DEFAULT 'received',
  payment_status  TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  total_cost      REAL NOT NULL,
  shipping_fee    REAL DEFAULT 0,
  other_costs     REAL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                 TEXT PRIMARY KEY,
  purchase_order_id  TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id         TEXT REFERENCES products(id),
  quantity           REAL NOT NULL,
  cost_price         REAL NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ==========================================
-- 财务
-- ==========================================

CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  type         TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category     TEXT NOT NULL,
  amount       REAL NOT NULL,
  note         TEXT,
  related_id   TEXT,
  ledger_type  TEXT DEFAULT 'cash' CHECK (ledger_type IN ('cash', 'ar', 'ap')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type        ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_type ON transactions (ledger_type);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  value          REAL NOT NULL,
  purchase_date  TEXT DEFAULT (date('now')),
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS finance_summary (
  id             TEXT PRIMARY KEY,
  total_revenue  REAL DEFAULT 0,
  total_expense  REAL DEFAULT 0,
  total_ar       REAL DEFAULT 0,
  total_ap       REAL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at        ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status            ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id     ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id   ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_order_id  ON purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product   ON purchase_order_items (product_id);
