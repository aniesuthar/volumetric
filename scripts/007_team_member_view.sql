-- Create a view that safely exposes team member information including emails
-- This avoids direct access to auth.users table from the client
-- Note: Views in Supabase inherit RLS from underlying tables, so no separate policies needed

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

-- Enable security invoker mode so the view uses the calling user's permissions
alter view public.team_members_with_email set (security_invoker = true);

-- Grant access to the view for authenticated users
grant select on public.team_members_with_email to authenticated;