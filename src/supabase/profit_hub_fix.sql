
-- 1. Enable RLS on all relevant tables (if not already enabled)
alter table public.system_settings enable row level security;
alter table public.profit_stakeholders enable row level security;
alter table public.profit_payouts enable row level security;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Public Read Access" on public.system_settings;
drop policy if exists "Admin Manage Profit Reserve" on public.system_settings;
drop policy if exists "Public Read Access" on public.profit_stakeholders;
drop policy if exists "Admin Manage Stakeholders" on public.profit_stakeholders;
drop policy if exists "Public Read Access" on public.profit_payouts;
drop policy if exists "Admin Manage Payouts" on public.profit_payouts;

-- 3. Create Unified Read Policies (Read access for dashboard)
create policy "Public Read Access" on public.system_settings for select using (true);
create policy "Public Read Access" on public.profit_stakeholders for select using (true);
create policy "Public Read Access" on public.profit_payouts for select using (true);

-- 4. Create Write Policies for Admin (Allows upsert/management)
-- Note: Using (true) for anons for simplicity in this dev phase, 
-- but in production, these should be restricted to authenticated admin roles.
create policy "Admin Manage Profit Reserve" on public.system_settings
  for all using (true) with check (true);

create policy "Admin Manage Stakeholders" on public.profit_stakeholders
  for all using (true) with check (true);

create policy "Admin Manage Payouts" on public.profit_payouts
  for all using (true) with check (true);
