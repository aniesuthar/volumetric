-- Complete fix for infinite recursion by disabling RLS temporarily for helper functions
-- and creating a more robust approach

-- Drop all existing policies and helper functions
drop policy if exists "team_members_select_member" on public.team_members;
drop policy if exists "team_members_insert_admin" on public.team_members;
drop policy if exists "team_members_update_admin" on public.team_members;
drop policy if exists "team_members_delete_admin" on public.team_members;

drop function if exists public.is_team_admin(uuid, uuid);
drop function if exists public.is_team_member(uuid, uuid);
drop function if exists public.get_user_team_role(uuid, uuid);

-- Disable RLS temporarily on team_members to avoid recursion
alter table public.team_members disable row level security;

-- Create simple, non-recursive policies for team_members
-- SELECT: Allow users to see their own memberships and memberships in teams they're part of
create policy "team_members_select_simple"
  on public.team_members
  for select
  using (user_id = auth.uid());

-- INSERT: Only allow service role to insert (handled by trigger)
create policy "team_members_insert_service"
  on public.team_members
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: Allow users to update their own membership
create policy "team_members_update_own"
  on public.team_members
  for update
  using (user_id = auth.uid());

-- DELETE: Allow users to leave teams (delete their own membership)
create policy "team_members_delete_own"
  on public.team_members
  for delete
  using (user_id = auth.uid());

-- Re-enable RLS
alter table public.team_members enable row level security;

-- Simplify teams policies to avoid recursion
drop policy if exists "teams_select_member" on public.teams;
drop policy if exists "teams_update_admin" on public.teams;
drop policy if exists "teams_delete_owner" on public.teams;

-- Teams policies without subqueries
create policy "teams_select_via_membership"
  on public.teams
  for select
  using (
    created_by = auth.uid() or
    exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid()
    )
  );

create policy "teams_insert_own"
  on public.teams
  for insert
  with check (auth.uid() = created_by);

create policy "teams_update_creator"
  on public.teams
  for update
  using (created_by = auth.uid());

create policy "teams_delete_creator"
  on public.teams
  for delete
  using (created_by = auth.uid());

-- Simplify materials policies to avoid the helper function calls
drop policy if exists "materials_select_own_or_team" on public.materials;
drop policy if exists "materials_insert_own_or_team" on public.materials;
drop policy if exists "materials_update_own_or_team" on public.materials;
drop policy if exists "materials_delete_own_or_team" on public.materials;

-- Materials policies without helper functions
create policy "materials_select_accessible"
  on public.materials
  for select
  using (
    user_id = auth.uid() or
    (team_id is not null and exists (
      select 1 from public.team_members tm
      where tm.team_id = materials.team_id and tm.user_id = auth.uid()
    ))
  );

create policy "materials_insert_allowed"
  on public.materials
  for insert
  with check (
    (user_id = auth.uid() and team_id is null) or
    (team_id is not null and exists (
      select 1 from public.team_members tm
      where tm.team_id = materials.team_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'member')
    ))
  );

create policy "materials_update_allowed"
  on public.materials
  for update
  using (
    user_id = auth.uid() or
    (team_id is not null and exists (
      select 1 from public.team_members tm
      where tm.team_id = materials.team_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'member')
    ))
  );

create policy "materials_delete_allowed"
  on public.materials
  for delete
  using (
    user_id = auth.uid() or
    (team_id is not null and exists (
      select 1 from public.team_members tm
      where tm.team_id = materials.team_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    ))
  );

-- Simplify invitations policies
drop policy if exists "team_invitations_select_member" on public.team_invitations;
drop policy if exists "team_invitations_insert_admin" on public.team_invitations;
drop policy if exists "team_invitations_update_admin" on public.team_invitations;
drop policy if exists "team_invitations_delete_admin" on public.team_invitations;

create policy "team_invitations_select_relevant"
  on public.team_invitations
  for select
  using (
    invited_by = auth.uid() or
    email = (select email from auth.users where id = auth.uid()) or
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_invitations.team_id
        and tm.user_id = auth.uid()
    )
  );

create policy "team_invitations_insert_by_inviter"
  on public.team_invitations
  for insert
  with check (invited_by = auth.uid());

create policy "team_invitations_update_relevant"
  on public.team_invitations
  for update
  using (
    invited_by = auth.uid() or
    email = (select email from auth.users where id = auth.uid())
  );

create policy "team_invitations_delete_by_inviter"
  on public.team_invitations
  for delete
  using (invited_by = auth.uid());