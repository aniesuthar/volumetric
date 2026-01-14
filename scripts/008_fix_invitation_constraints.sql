-- Fix team invitations table to avoid auth.users foreign key constraint
-- This prevents permission denied errors when creating invitations

-- First, drop the foreign key constraint on invited_by
alter table public.team_invitations
  drop constraint if exists team_invitations_invited_by_fkey;

-- Make invited_by nullable and remove the constraint to auth.users
-- We'll store the inviter's email or ID as a simple text field instead
alter table public.team_invitations
  alter column invited_by drop not null;

-- Add a comment to explain the change
comment on column public.team_invitations.invited_by is 'UUID of the user who sent the invitation - no foreign key constraint to avoid permission issues';