-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Sales Transactions Table
-- Stores individual sales records extracted from Invoice Excels
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  date date not null,
  invoice_no text,          -- e.g. "INV-101"
  customer_name text,       
  item_name text not null,  -- e.g. "GINGER PASTE"
  quantity numeric not null, -- kg
  rate numeric,             -- Price per kg
  amount numeric not null,   -- Total Value
  payment_mode text         -- "Cash", "Online", etc.
);

-- Index for faster querying by date
create index idx_transactions_date on public.transactions(date);


-- 2. Production Logs Table (Inventory)
-- Stores all stock movements: In (Purchase/Opening), Out (Usage), and Production
create table public.production_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  date date not null,
  type text not null,       -- 'stock_in' (Purchase/OS), 'usage' (Raw -> Peeled), 'production' (Peeled -> Paste)
  material text not null,   -- e.g. "GINGER RAW", "GINGER PEELED"
  weight numeric not null,  -- kg
  
  supplier text,            -- Only for 'stock_in' (Purchases)
  remarks text              -- Optional notes
);

-- Index for faster filtering
create index idx_production_material on public.production_logs(material);
create index idx_production_date on public.production_logs(date);


-- 3. Customers Table (Optional but good for analytics)
-- Normalized list of customers
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  phone text,
  last_order_date date
);

-- Row Level Security (RLS)
-- For now, we enable public read access (for the dashboard)
-- Write access should be restricted to authenticated users (Admin) in the future.

alter table public.transactions enable row level security;
alter table public.production_logs enable row level security;

-- Policy: Allow public read (anyone with the URL can see the dashboard)
create policy "Public Read Access" on public.transactions for select using (true);
create policy "Public Read Access" on public.production_logs for select using (true);

-- Policy: Allow authenticated insert (Admin only)
-- Note: You'll need to set up Supabase Auth for this to work effectively.
-- For simple start, we can allow anon insert for now or secure it later.
create policy "Admin Insert Access" on public.transactions for insert with check (true); 
create policy "Admin Insert Access" on public.production_logs for insert with check (true);
