-- Create Customer Stats Table for "Customerwise Profit" file data
create table if not exists public.customer_stats (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  date date not null,
  customer_name text not null,
  revenue numeric default 0,
  profit numeric default 0,
  
  unique(date, customer_name) -- Prevent duplicates for same month/customer
);

-- Index for date filtering
create index idx_customer_stats_date on public.customer_stats(date);

-- Enable RLS
alter table public.customer_stats enable row level security;

-- Policies (same as others)
create policy "Allow public read access" on public.customer_stats
  for select using (true);

create policy "Allow anon insert" on public.customer_stats
  for insert with check (true);

create policy "Allow anon update" on public.customer_stats
  for update using (true);

create policy "Allow anon delete" on public.customer_stats
  for delete using (true);
