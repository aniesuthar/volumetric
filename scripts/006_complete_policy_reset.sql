-- Complete reset of all policies and functions to fix recursion
-- This script drops everything and rebuilds from scratch

-- Step 1: Drop ALL existing policies on all tables first
-- Team members policies
drop policy if exists "team_members_select_member" on public.team_members;
drop policy if exists "team_members_select_simple" on public.team_members;
drop policy if exists "team_members_insert_admin" on public.team_members;
drop policy if exists "team_members_insert_service" on public.team_members;
drop policy if exists "team_members_update_admin" on public.team_members;
drop policy if exists "team_members_update_own" on public.team_members;
drop policy if exists "team_members_delete_admin" on public.team_members;
drop policy if exists "team_members_delete_own" on public.team_members;

-- Teams policies
drop policy if exists "teams_select_member" on public.teams;
drop policy if exists "teams_select_via_membership" on public.teams;
drop policy if exists "teams_insert_own" on public.teams;
drop policy if exists "teams_update_admin" on public.teams;
drop policy if exists "teams_update_creator" on public.teams;
drop policy if exists "teams_delete_owner" on public.teams;
drop policy if exists "teams_delete_creator" on public.teams;

-- Team invitations policies
drop policy if exists "team_invitations_select_member" on public.team_invitations;
drop policy if exists "team_invitations_select_relevant" on public.team_invitations;
drop policy if exists "team_invitations_insert_admin" on public.team_invitations;
drop policy if exists "team_invitations_insert_by_inviter" on public.team_invitations;
drop policy if exists "team_invitations_update_admin" on public.team_invitations;
drop policy if exists "team_invitations_update_relevant" on public.team_invitations;
drop policy if exists "team_invitations_delete_admin" on public.team_invitations;
drop policy if exists "team_invitations_delete_by_inviter" on public.team_invitations;

-- Materials policies
drop policy if exists "materials_select_own_or_team" on public.materials;
drop policy if exists "materials_select_accessible" on public.materials;
drop policy if exists "materials_insert_own_or_team" on public.materials;
drop policy if exists "materials_insert_allowed" on public.materials;
drop policy if exists "materials_update_own_or_team" on public.materials;
drop policy if exists "materials_update_allowed" on public.materials;
drop policy if exists "materials_delete_own_or_team" on public.materials;
drop policy if exists "materials_delete_allowed" on public.materials;

-- Step 2: Now drop the functions (no dependencies should remain)
drop function if exists public.is_team_admin(uuid, uuid);
drop function if exists public.is_team_member(uuid, uuid);
drop function if exists public.get_user_team_role(uuid, uuid);

-- Step 3: Create new simple policies without recursion

-- TEAM_MEMBERS table policies
create policy "team_members_select_own"
  on public.team_members
  for select
  using (user_id = auth.uid());

create policy "team_members_insert_own"
  on public.team_members
  for insert
  with check (user_id = auth.uid());

create policy "team_members_update_own"
  on public.team_members
  for update
  using (user_id = auth.uid());

create policy "team_members_delete_own"
  on public.team_members
  for delete
  using (user_id = auth.uid());

-- TEAMS table policies
create policy "teams_select_if_member"
  on public.teams
  for select
  using (
    created_by = auth.uid() or
    id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
    )
  );

create policy "teams_insert_as_creator"
  on public.teams
  for insert
  with check (created_by = auth.uid());

create policy "teams_update_if_creator"
  on public.teams
  for update
  using (created_by = auth.uid());

create policy "teams_delete_if_creator"
  on public.teams
  for delete
  using (created_by = auth.uid());

-- TEAM_INVITATIONS table policies
create policy "team_invitations_select_if_relevant"
  on public.team_invitations
  for select
  using (
    invited_by = auth.uid() or
    email = (select email from auth.users where id = auth.uid()) or
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
    )
  );

create policy "team_invitations_insert_if_inviter"
  on public.team_invitations
  for insert
  with check (invited_by = auth.uid());

create policy "team_invitations_update_if_relevant"
  on public.team_invitations
  for update
  using (
    invited_by = auth.uid() or
    email = (select email from auth.users where id = auth.uid())
  );

create policy "team_invitations_delete_if_inviter"
  on public.team_invitations
  for delete
  using (invited_by = auth.uid());

-- MATERIALS table policies (simplified)
create policy "materials_select_if_accessible"
  on public.materials
  for select
  using (
    user_id = auth.uid() or
    (team_id is not null and team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
    ))
  );

create policy "materials_insert_if_allowed"
  on public.materials
  for insert
  with check (
    (user_id = auth.uid() and team_id is null) or
    (team_id is not null and team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
    ))
  );

create policy "materials_update_if_allowed"
  on public.materials
  for update
  using (
    user_id = auth.uid() or
    (team_id is not null and team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
    ))
  );

create policy "materials_delete_if_allowed"
  on public.materials
  for delete
  using (
    user_id = auth.uid() or
    (team_id is not null and team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    ))
  );

-- Ensure RLS is enabled on all tables
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.materials enable row level security;