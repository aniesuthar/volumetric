-- enable required extension for gen_random_uuid if not present
create extension if not exists pgcrypto;

-- materials catalog per user
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('Sariya','Pati','Sheet','Pipe','Other')),
  name text not null,
  base_length_ft numeric not null default 20,
  weight_at_base_kg numeric not null,
  price_per_kg numeric not null,
  created_at timestamptz not null default now(),
  notes text -- add optional notes column for materials if not present
);

-- RLS
alter table public.materials enable row level security;

-- Policies: user can do everything on own rows
create policy "materials_select_own"
  on public.materials
  for select
  using (auth.uid() = user_id);

create policy "materials_insert_own"
  on public.materials
  for insert
  with check (auth.uid() = user_id);

create policy "materials_update_own"
  on public.materials
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "materials_delete_own"
  on public.materials
  for delete
  using (auth.uid() = user_id);
