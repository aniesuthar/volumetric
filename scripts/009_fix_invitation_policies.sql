-- Fix team invitations RLS policies to avoid auth.users table access
-- This prevents "permission denied for table users" errors

-- Drop all existing team_invitations policies
drop policy if exists "team_invitations_select_if_relevant" on public.team_invitations;
drop policy if exists "team_invitations_insert_if_inviter" on public.team_invitations;
drop policy if exists "team_invitations_update_if_relevant" on public.team_invitations;
drop policy if exists "team_invitations_delete_if_inviter" on public.team_invitations;

-- Create simpler policies that don't reference auth.users table

-- SELECT: Only team members can see invitations for their teams
create policy "team_invitations_select_team_members"
  on public.team_invitations
  for select
  using (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
    )
  );

-- INSERT: Only team owners/admins can create invitations (simplified)
create policy "team_invitations_insert_team_admin"
  on public.team_invitations
  for insert
  with check (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- UPDATE: Only team owners/admins can update invitations
create policy "team_invitations_update_team_admin"
  on public.team_invitations
  for update
  using (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- DELETE: Only team owners/admins can delete invitations
create policy "team_invitations_delete_team_admin"
  on public.team_invitations
  for delete
  using (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );