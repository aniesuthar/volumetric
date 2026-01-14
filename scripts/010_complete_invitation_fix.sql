-- Complete fix for team invitations permission issues
-- Run this script to resolve all "permission denied for table users" errors

-- PART 1: Fix team_invitations table constraints
-- Remove foreign key constraint that requires access to auth.users
alter table public.team_invitations
  drop constraint if exists team_invitations_invited_by_fkey;

-- Make invited_by nullable so it can be omitted
alter table public.team_invitations
  alter column invited_by drop not null;

-- PART 2: Replace problematic RLS policies
-- Drop all existing team_invitations policies that reference auth.users
drop policy if exists "team_invitations_select_member" on public.team_invitations;
drop policy if exists "team_invitations_select_if_relevant" on public.team_invitations;
drop policy if exists "team_invitations_insert_admin" on public.team_invitations;
drop policy if exists "team_invitations_insert_if_inviter" on public.team_invitations;
drop policy if exists "team_invitations_insert_by_inviter" on public.team_invitations;
drop policy if exists "team_invitations_update_admin" on public.team_invitations;
drop policy if exists "team_invitations_update_if_relevant" on public.team_invitations;
drop policy if exists "team_invitations_update_relevant" on public.team_invitations;
drop policy if exists "team_invitations_delete_admin" on public.team_invitations;
drop policy if exists "team_invitations_delete_if_inviter" on public.team_invitations;
drop policy if exists "team_invitations_delete_by_inviter" on public.team_invitations;

-- Create new policies that only use team_members table (no auth.users access)
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

-- PART 3: Create team members view with email (optional - for future use)
create or replace view public.team_members_with_email as
select
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  u.email
from public.team_members tm
join auth.users u on tm.user_id = u.id;

-- Enable security invoker mode
alter view public.team_members_with_email set (security_invoker = true);

-- Grant access to the view
grant select on public.team_members_with_email to authenticated;

-- PART 4: Add helpful comment
comment on table public.team_invitations is 'Team invitations table - invited_by field is nullable to avoid auth.users constraint issues';