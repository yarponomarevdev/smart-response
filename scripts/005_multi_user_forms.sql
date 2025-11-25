-- Create forms table for multi-user form management
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Form',
  is_active boolean default true,
  lead_limit integer default 20,
  lead_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create form_content table for per-form customizable content
create table if not exists public.form_content (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  key text not null,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(form_id, key)
);

-- Add form_id to leads table
alter table public.leads add column if not exists form_id uuid references public.forms(id) on delete cascade;

-- Create users table for role management
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text default 'admin' check (role in ('superadmin', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert superadmin
insert into public.users (id, email, role)
select id, email, 'superadmin'
from auth.users
where email = 'hello@vasilkov.digital'
on conflict (id) do update set role = 'superadmin';

-- Enable RLS on new tables
alter table public.forms enable row level security;
alter table public.form_content enable row level security;
alter table public.users enable row level security;

-- Forms policies
create policy "users_can_view_own_forms"
  on public.forms for select
  to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from public.users where id = auth.uid() and role = 'superadmin'
  ));

create policy "users_can_create_own_form"
  on public.forms for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "users_can_update_own_forms"
  on public.forms for update
  to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from public.users where id = auth.uid() and role = 'superadmin'
  ));

create policy "users_can_delete_own_forms"
  on public.forms for delete
  to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from public.users where id = auth.uid() and role = 'superadmin'
  ));

-- Form content policies
create policy "anyone_can_read_form_content"
  on public.form_content for select
  to anon, authenticated
  using (true);

create policy "form_owners_can_manage_content"
  on public.form_content for all
  to authenticated
  using (
    exists (
      select 1 from public.forms 
      where id = form_content.form_id 
      and (owner_id = auth.uid() or exists (
        select 1 from public.users where id = auth.uid() and role = 'superadmin'
      ))
    )
  );

-- Update leads policies for form-based access
drop policy if exists "authenticated_can_view_all_leads" on public.leads;
create policy "users_can_view_form_leads"
  on public.leads for select
  to authenticated
  using (
    form_id is null or -- backward compatibility for main form
    exists (
      select 1 from public.forms 
      where id = leads.form_id 
      and (owner_id = auth.uid() or exists (
        select 1 from public.users where id = auth.uid() and role = 'superadmin'
      ))
    )
  );

-- Users policies
create policy "users_can_view_own_profile"
  on public.users for select
  to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.users where id = auth.uid() and role = 'superadmin'
  ));

-- Create indexes
create index if not exists forms_owner_id_idx on public.forms(owner_id);
create index if not exists forms_is_active_idx on public.forms(is_active);
create index if not exists form_content_form_id_idx on public.form_content(form_id);
create index if not exists leads_form_id_idx on public.leads(form_id);
create index if not exists users_email_idx on public.users(email);
create index if not exists users_role_idx on public.users(role);

-- Function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'hello@vasilkov.digital' then 'superadmin' else 'admin' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to increment lead count
create or replace function public.increment_lead_count()
returns trigger as $$
begin
  if new.form_id is not null then
    update public.forms
    set lead_count = lead_count + 1,
        updated_at = now()
    where id = new.form_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to increment lead count
drop trigger if exists on_lead_created on public.leads;
create trigger on_lead_created
  after insert on public.leads
  for each row execute procedure public.increment_lead_count();
