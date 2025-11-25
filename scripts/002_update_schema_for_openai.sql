-- Add columns for OpenAI-generated results and apartment size
alter table public.leads 
  add column if not exists result_type text check (result_type in ('text', 'image')),
  add column if not exists result_text text,
  add column if not exists result_image_url text,
  add column if not exists apartment_size integer,
  drop column if exists score;

-- Add admin configuration for OpenAI prompts
insert into public.content (key, value) values
  ('system_prompt', '{"text": "Analyze this URL and provide interior design recommendations."}'),
  ('result_format', '{"type": "text"}'),
  ('apartment_size_title', '{"text": "What is your apartment size?"}'),
  ('apartment_size_description', '{"text": "Enter your apartment size in square meters to get personalized recommendations"}')
on conflict (key) do nothing;
