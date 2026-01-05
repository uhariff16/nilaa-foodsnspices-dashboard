-- Create a table for public profiles (User Roles)
create table public.user_roles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policies
-- 1. Admins can view/edit all roles
create policy "Admins can do everything on roles"
  on public.user_roles
  for all
  using (
    auth.uid() in (
      select id from public.user_roles where role = 'admin'
    )
  );

-- 2. Users can view their own role
create policy "Users can view own role"
  on public.user_roles
  for select
  using (
    auth.uid() = id
  );

-- Trigger to create a user_role entry on Signup
-- Note: The first user usually needs to be manually set to 'admin' in Supabase Dashboard
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_roles (id, email, role)
  values (new.id, new.email, 'viewer');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
