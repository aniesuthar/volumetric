-- Fix infinite recursion in team_members policies
-- Drop all existing policies on team_members to start fresh
drop policy if exists "team_members_select_member" on public.team_members;
drop policy if exists "team_members_insert_admin" on public.team_members;
drop policy if exists "team_members_delete_admin" on public.team_members;

-- Create helper function to check if user is team admin without recursion
create or replace function public.is_team_admin(p_team_id uuid, p_user_id uuid)
returns boolean as $$
declare
  v_role text;
begin
  -- Direct query without RLS to avoid recursion
  select role into v_role
  from public.team_members
  where team_id = p_team_id
    and user_id = p_user_id
    and role in ('owner', 'admin');

  return v_role is not null;
end;
$$ language plpgsql security definer stable;

-- Create helper function to check if user is team member without recursion
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and user_id = p_user_id
  );
end;
$$ language plpgsql security definer stable;

-- Recreate team_members policies using helper functions
-- SELECT: Users can see members of teams they belong to
create policy "team_members_select_member"
  on public.team_members
  for select
  using (
    public.is_team_member(team_id, auth.uid())
  );

-- INSERT: Only admins and owners can add new members
create policy "team_members_insert_admin"
  on public.team_members
  for insert
  with check (
    public.is_team_admin(team_id, auth.uid())
  );

-- UPDATE: Only admins and owners can update member roles
create policy "team_members_update_admin"
  on public.team_members
  for update
  using (
    public.is_team_admin(team_id, auth.uid())
  )
  with check (
    public.is_team_admin(team_id, auth.uid())
  );

-- DELETE: Only admins and owners can remove members
create policy "team_members_delete_admin"
  on public.team_members
  for delete
  using (
    public.is_team_admin(team_id, auth.uid())
  );

-- Fix teams policies to use helper functions as well
drop policy if exists "teams_select_member" on public.teams;
drop policy if exists "teams_update_admin" on public.teams;
drop policy if exists "teams_delete_owner" on public.teams;

-- Teams SELECT: Users can see teams they're members of
create policy "teams_select_member"
  on public.teams
  for select
  using (
    public.is_team_member(id, auth.uid())
  );

-- Teams UPDATE: Only admins and owners can update team details
create policy "teams_update_admin"
  on public.teams
  for update
  using (
    public.is_team_admin(id, auth.uid())
  );

-- Teams DELETE: Only owners can delete teams
create policy "teams_delete_owner"
  on public.teams
  for delete
  using (
    exists (
      select 1
      from public.team_members
      where team_id = teams.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- Fix team_invitations policies to use helper functions
drop policy if exists "team_invitations_select_member" on public.team_invitations;
drop policy if exists "team_invitations_insert_admin" on public.team_invitations;
drop policy if exists "team_invitations_update_admin" on public.team_invitations;
drop policy if exists "team_invitations_delete_admin" on public.team_invitations;

-- Invitations SELECT: Team members can see invitations, or if the invitation is for them
create policy "team_invitations_select_member"
  on public.team_invitations
  for select
  using (
    public.is_team_member(team_id, auth.uid()) or
    email = (select email from auth.users where id = auth.uid())
  );

-- Invitations INSERT: Only admins and owners can create invitations
create policy "team_invitations_insert_admin"
  on public.team_invitations
  for insert
  with check (
    public.is_team_admin(team_id, auth.uid()) and
    invited_by = auth.uid()
  );

-- Invitations UPDATE: Admins/owners or the invitee can update (for accepting)
create policy "team_invitations_update_admin"
  on public.team_invitations
  for update
  using (
    public.is_team_admin(team_id, auth.uid()) or
    email = (select email from auth.users where id = auth.uid())
  );

-- Invitations DELETE: Only admins and owners can delete invitations
create policy "team_invitations_delete_admin"
  on public.team_invitations
  for delete
  using (
    public.is_team_admin(team_id, auth.uid())
  );