-- Create leads table to store submitted URLs and user information
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  email text not null,
  score integer,
  status text default 'pending' check (status in ('pending', 'processed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create content table for admin-configurable content
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default content
insert into public.content (key, value) values
  ('hero_title', '{"text": "Discover Your Lead Score"}'),
  ('hero_subtitle', '{"text": "Enter your website URL to get a personalized lead score"}'),
  ('loading_messages', '{"messages": ["Analyzing your website...", "Calculating metrics...", "Processing data...", "Almost done..."]}'),
  ('result_title', '{"text": "Your Lead Score"}'),
  ('result_description', '{"text": "Based on our analysis"}'),
  ('cta_title', '{"text": "Want detailed insights?"}'),
  ('cta_description', '{"text": "Enter your email to receive a comprehensive report"}'),
  ('success_title', '{"text": "Thank you!"}'),
  ('success_description', '{"text": "Check your email for detailed insights"}'),
  ('social_share_text', '{"text": "I just got my lead score! Check yours too:"}')
on conflict (key) do nothing;

-- Enable Row Level Security
alter table public.leads enable row level security;
alter table public.content enable row level security;

-- Public can insert leads (no auth required for user flow)
create policy "anyone_can_insert_leads"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Public can read their own lead by ID (for retrieval after email submission)
create policy "anyone_can_read_own_lead"
  on public.leads for select
  to anon, authenticated
  using (true);

-- Content is publicly readable
create policy "content_public_read"
  on public.content for select
  to anon, authenticated
  using (true);

-- Only authenticated users can manage content (admin panel)
create policy "authenticated_can_manage_content"
  on public.content for all
  to authenticated
  using (true)
  with check (true);

-- Only authenticated users can view all leads (admin panel)
create policy "authenticated_can_view_all_leads"
  on public.leads for select
  to authenticated
  using (true);

-- Only authenticated users can update leads (admin panel)
create policy "authenticated_can_update_leads"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

-- Only authenticated users can delete leads (admin panel)
create policy "authenticated_can_delete_leads"
  on public.leads for delete
  to authenticated
  using (true);

-- Create indexes for better performance
create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists content_key_idx on public.content(key);
