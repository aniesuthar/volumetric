-- Create table for Meesho orders
create table if not exists public.meesho_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Order details
  order_id text not null,
  product_name text,
  sku text,
  quantity integer,
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_city text,
  customer_state text,
  customer_pincode text,

  -- Shipping details
  awb_number text,
  courier_partner text,

  -- Delivery status
  status text not null default 'pending' check (status in ('pending', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'rto', 'cancelled')),
  last_status_update timestamptz,
  expected_delivery_date timestamptz,
  delivered_date timestamptz,

  -- Label file
  label_file_url text,
  label_file_name text,

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Additional fields
  notes text,
  tracking_history jsonb default '[]'::jsonb
);

-- Create index for faster queries
create index if not exists idx_meesho_orders_user_id on public.meesho_orders(user_id);
create index if not exists idx_meesho_orders_order_id on public.meesho_orders(order_id);
create index if not exists idx_meesho_orders_awb on public.meesho_orders(awb_number);
create index if not exists idx_meesho_orders_status on public.meesho_orders(status);

-- Enable RLS
alter table public.meesho_orders enable row level security;

-- RLS Policies: Users can only access their own orders
create policy "meesho_orders_select_own"
  on public.meesho_orders
  for select
  using (auth.uid() = user_id);

create policy "meesho_orders_insert_own"
  on public.meesho_orders
  for insert
  with check (auth.uid() = user_id);

create policy "meesho_orders_update_own"
  on public.meesho_orders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meesho_orders_delete_own"
  on public.meesho_orders
  for delete
  using (auth.uid() = user_id);

-- Create function to update updated_at timestamp
create or replace function public.update_meesho_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-update updated_at
create trigger meesho_orders_updated_at
  before update on public.meesho_orders
  for each row
  execute function public.update_meesho_orders_updated_at();
