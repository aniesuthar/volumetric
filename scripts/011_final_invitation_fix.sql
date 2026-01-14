-- Final fix for team invitations - handles existing policies gracefully
-- This script can be run multiple times safely

-- PART 1: Fix the core constraint issue
alter table public.team_invitations
  drop constraint if exists team_invitations_invited_by_fkey;

alter table public.team_invitations
  alter column invited_by drop not null;

-- Add token column for email invitations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='team_invitations'
        AND column_name='token'
    ) THEN
        ALTER TABLE public.team_invitations ADD COLUMN token TEXT;
    END IF;
END $$;

-- Create unique index on token for security and performance
CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_token_idx
ON public.team_invitations(token)
WHERE token IS NOT NULL;

-- PART 2: Replace ALL existing policies with clean ones
-- Drop all possible policy names that might exist
drop policy if exists "team_invitations_select_member" on public.team_invitations;
drop policy if exists "team_invitations_select_if_relevant" on public.team_invitations;
drop policy if exists "team_invitations_select_team_members" on public.team_invitations;
drop policy if exists "team_invitations_insert_admin" on public.team_invitations;
drop policy if exists "team_invitations_insert_if_inviter" on public.team_invitations;
drop policy if exists "team_invitations_insert_by_inviter" on public.team_invitations;
drop policy if exists "team_invitations_insert_team_admin" on public.team_invitations;
drop policy if exists "team_invitations_update_admin" on public.team_invitations;
drop policy if exists "team_invitations_update_if_relevant" on public.team_invitations;
drop policy if exists "team_invitations_update_relevant" on public.team_invitations;
drop policy if exists "team_invitations_update_team_admin" on public.team_invitations;
drop policy if exists "team_invitations_delete_admin" on public.team_invitations;
drop policy if exists "team_invitations_delete_if_inviter" on public.team_invitations;
drop policy if exists "team_invitations_delete_by_inviter" on public.team_invitations;
drop policy if exists "team_invitations_delete_team_admin" on public.team_invitations;

-- PART 3: Create new clean policies (with unique names) - drop first to avoid conflicts
drop policy if exists "team_invitations_select_v2" on public.team_invitations;
drop policy if exists "team_invitations_insert_v2" on public.team_invitations;
drop policy if exists "team_invitations_update_v2" on public.team_invitations;
drop policy if exists "team_invitations_delete_v2" on public.team_invitations;

create policy "team_invitations_select_v2"
  on public.team_invitations
  for select
  using (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid()
    )
  );

create policy "team_invitations_insert_v2"
  on public.team_invitations
  for insert
  with check (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "team_invitations_update_v2"
  on public.team_invitations
  for update
  using (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "team_invitations_delete_v2"
  on public.team_invitations
  for delete
  using (
    team_id in (
      select distinct team_id
      from public.team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );