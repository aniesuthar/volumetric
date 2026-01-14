-- Update materials policies to properly enforce Admin and Viewer permissions
-- Drop existing policies
drop policy if exists "materials_select_own_or_team" on public.materials;
drop policy if exists "materials_insert_own_or_team" on public.materials;
drop policy if exists "materials_update_own_or_team" on public.materials;
drop policy if exists "materials_delete_own_or_team" on public.materials;

-- Create a security definer function to check team membership without recursion
create or replace function public.get_user_team_role(p_team_id uuid, p_user_id uuid)
returns text as $$
declare
  v_role text;
begin
  select role into v_role
  from public.team_members
  where team_id = p_team_id and user_id = p_user_id;

  return v_role;
end;
$$ language plpgsql security definer stable;

-- SELECT: All team members (including viewers) can view materials
create policy "materials_select_own_or_team"
  on public.materials
  for select
  using (
    auth.uid() = user_id or
    public.get_user_team_role(team_id, auth.uid()) is not null
  );

-- INSERT: Only owners, admins, and members can create materials (viewers cannot)
create policy "materials_insert_own_or_team"
  on public.materials
  for insert
  with check (
    (auth.uid() = user_id and team_id is null) or
    (public.get_user_team_role(team_id, auth.uid()) in ('owner', 'admin', 'member'))
  );

-- UPDATE: Only owners, admins, and members can update materials (viewers cannot)
create policy "materials_update_own_or_team"
  on public.materials
  for update
  using (
    (auth.uid() = user_id and team_id is null) or
    public.get_user_team_role(team_id, auth.uid()) in ('owner', 'admin', 'member')
  )
  with check (
    (auth.uid() = user_id and team_id is null) or
    public.get_user_team_role(team_id, auth.uid()) in ('owner', 'admin', 'member')
  );

-- DELETE: Only owners and admins can delete materials
create policy "materials_delete_own_or_team"
  on public.materials
  for delete
  using (
    (auth.uid() = user_id and team_id is null) or
    public.get_user_team_role(team_id, auth.uid()) in ('owner', 'admin')
  );

-- Add a comment to clarify the role permissions
comment on table public.materials is 'Materials catalog with team-based access control. Viewers have read-only access, Members can create/edit, Admins can create/edit/delete, Owners have full control.';
