-- Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Team members junction table
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- Team invitations table
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null check (status in ('pending', 'accepted', 'expired')) default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique(team_id, email, status)
);

-- Add team_id to materials table
alter table public.materials
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

-- Create index for better performance
create index if not exists idx_materials_team_id on public.materials(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_invitations_email on public.team_invitations(email);
create index if not exists idx_team_invitations_token on public.team_invitations(token);

-- Enable RLS
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;

-- Teams policies: users can see teams they're members of
create policy "teams_select_member"
  on public.teams
  for select
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid()
    )
  );

create policy "teams_insert_own"
  on public.teams
  for insert
  with check (auth.uid() = created_by);

create policy "teams_update_admin"
  on public.teams
  for update
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "teams_delete_owner"
  on public.teams
  for delete
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Team members policies
create policy "team_members_select_member"
  on public.team_members
  for select
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid()
    )
  );

create policy "team_members_insert_admin"
  on public.team_members
  for insert
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "team_members_delete_admin"
  on public.team_members
  for delete
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Team invitations policies
create policy "team_invitations_select_member"
  on public.team_invitations
  for select
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid()
    ) or email = (select email from auth.users where id = auth.uid())
  );

create policy "team_invitations_insert_admin"
  on public.team_invitations
  for insert
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "team_invitations_update_admin"
  on public.team_invitations
  for update
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    ) or email = (select email from auth.users where id = auth.uid())
  );

create policy "team_invitations_delete_admin"
  on public.team_invitations
  for delete
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Update materials policies to support team access
drop policy if exists "materials_select_own" on public.materials;
drop policy if exists "materials_insert_own" on public.materials;
drop policy if exists "materials_update_own" on public.materials;
drop policy if exists "materials_delete_own" on public.materials;

create policy "materials_select_own_or_team"
  on public.materials
  for select
  using (
    auth.uid() = user_id or
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid()
    )
  );

create policy "materials_insert_own_or_team"
  on public.materials
  for insert
  with check (
    (auth.uid() = user_id and team_id is null) or
    (team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    ))
  );

create policy "materials_update_own_or_team"
  on public.materials
  for update
  using (
    auth.uid() = user_id or
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  )
  with check (
    auth.uid() = user_id or
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  );

create policy "materials_delete_own_or_team"
  on public.materials
  for delete
  using (
    auth.uid() = user_id or
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Function to automatically add creator as team owner
create or replace function public.add_team_owner()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (NEW.id, NEW.created_by, 'owner');
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_team_created
  after insert on public.teams
  for each row
  execute function public.add_team_owner();
