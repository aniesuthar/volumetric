-- Create storage bucket for Meesho labels
insert into storage.buckets (id, name, public)
values ('meesho-labels', 'meesho-labels', true)
on conflict (id) do nothing;

-- Storage policies for meesho-labels bucket
create policy "Users can upload their own labels"
  on storage.objects for insert
  with check (
    bucket_id = 'meesho-labels' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own labels"
  on storage.objects for select
  using (
    bucket_id = 'meesho-labels' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own labels"
  on storage.objects for delete
  using (
    bucket_id = 'meesho-labels' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public can view labels"
  on storage.objects for select
  using (bucket_id = 'meesho-labels');
