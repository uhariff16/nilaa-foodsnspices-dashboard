-- Create Customer Receivables Table for snapshot data
create table if not exists public.customer_receivables (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  customer_name text not null,
  address text,
  city text,
  phone text,
  balance_due numeric default 0,
  
  unique(customer_name) -- Assuming one snapshot record per customer
);

-- Index for analytics
create index idx_receivables_customer on public.customer_receivables(customer_name);

-- Enable RLS
alter table public.customer_receivables enable row level security;

-- Policies
create policy "Allow public read access" on public.customer_receivables
  for select using (true);

create policy "Allow admin insert" on public.customer_receivables
  for insert with check (true);

create policy "Allow admin update" on public.customer_receivables
  for update using (true);

create policy "Allow admin delete" on public.customer_receivables
  for delete using (true);
