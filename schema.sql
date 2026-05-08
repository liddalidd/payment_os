-- ==========================================
-- 收银与库存管理系统 - 数据库初始化脚本
-- 适用于 Supabase (PostgreSQL)
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 商品与库存
-- ==========================================

-- Products Table (商品表)
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  barcode text, -- 条码
  sku text, -- 自定义编码
  category text, -- 分类
  image_url text, -- 商品图片
  unit text default '件', -- 单位

  -- Prices
  cost_price numeric(10,2) default 0, -- 进价
  retail_price numeric(10,2) default 0, -- 零售价
  wholesale_price numeric(10,2) default 0, -- 批发价

  -- Inventory (支持小数数量)
  stock_quantity numeric(10,2) default 0,
  min_stock_level integer default 5, -- 预警库存

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Suppliers Table (供应商)
create table suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Customers Table (客户 - CRM)
create table customers (
  id uuid default uuid_generate_v4() primary key,
  name text,
  phone text unique,
  region text, -- 地域 (CRM Requirement)
  address text,

  member_level text default 'bronze', -- 会员等级
  points integer default 0, -- 积分

  total_spent numeric(12,2) default 0, -- 累计消费 (RFM - Monetary)
  purchase_count integer default 0, -- 消费次数 (RFM - Frequency)
  last_purchase_at timestamp with time zone, -- 最近消费 (RFM - Recency)

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 销售订单
-- ==========================================

-- Orders Table (订单 - Outbound)
create table orders (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references customers(id),
  type text check (type in ('retail', 'wholesale')), -- 零售 vs 批发
  status text default 'completed', -- pending, completed, cancelled, refunded

  total_amount numeric(10,2) not null,
  discount_amount numeric(10,2) default 0, -- 订单折扣
  payment_method text, -- wechat, alipay, cash, card

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items (订单明细)
create table order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),

  quantity numeric(10,2) not null, -- 支持小数数量
  price_at_sale numeric(10,2) not null, -- 销售时的单价
  original_price numeric(10,2), -- 原始零售价 (用于显示折扣)
  cost_at_sale numeric(10,2), -- 销售时的成本 (用于计算毛利)

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 进货 / 出库
-- ==========================================

-- Purchase Orders Table (进货单 / 出库单)
create table purchase_orders (
  id uuid default uuid_generate_v4() primary key,
  supplier_id uuid references suppliers(id),
  type text default 'inbound' check (type in ('inbound', 'outbound')), -- 入库 vs 出库
  status text default 'received', -- ordered, received
  payment_status text default 'unpaid' check (payment_status in ('paid', 'unpaid')),
  total_cost numeric(10,2) not null,
  shipping_fee numeric(10,2) default 0, -- 运费
  other_costs numeric(10,2) default 0, -- 其他成本
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchase Order Items
create table purchase_order_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_order_id uuid references purchase_orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity numeric(10,2) not null, -- 支持小数数量
  cost_price numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 财务
-- ==========================================

-- 收支流水表 (记录订单与非订单类开支，如租金水电)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('income', 'expense')) not null,
  category text not null, -- 房租、工资、水电、其他收入 等
  amount numeric(10,2) not null,
  note text,
  related_id uuid, -- 关联单据 ID (订单/进货单等)
  ledger_type text default 'cash' check (ledger_type in ('cash', 'ar', 'ap')), -- 现金流 / 应收 / 应付
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_transactions_created_at on transactions (created_at);
create index if not exists idx_transactions_type on transactions (type);
create index if not exists idx_transactions_ledger_type on transactions (ledger_type);

-- 固定资产表
create table fixed_assets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  value numeric(10,2) not null, -- 购买价值或当前估值
  purchase_date date default current_date,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 财务概览快照表
create table finance_summary (
  id uuid default uuid_generate_v4() primary key,
  total_revenue numeric(15,2) default 0,
  total_expense numeric(15,2) default 0,
  total_ar numeric(15,2) default 0, -- 总应收
  total_ap numeric(15,2) default 0, -- 总应付
  updated_at timestamp with time zone default now()
);

-- ==========================================
-- 权限 (Row Level Security)
-- ==========================================

alter table products enable row level security;
create policy "Allow all access" on products for all using (true) with check (true);

-- ==========================================
-- 存储桶 (商品图片)
-- ==========================================

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "Public Access to Products Bucket"
on storage.objects for all
using ( bucket_id = 'products' )
with check ( bucket_id = 'products' );

-- ==========================================
-- 部署提示：
-- 执行完此脚本后，请在 Supabase Dashboard:
--   Project Settings -> API -> 点击 "Refresh Schema Cache"
-- ==========================================
