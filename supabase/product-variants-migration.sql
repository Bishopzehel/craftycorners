-- Craftycorners: add colour variants to existing catalogue
-- Run this once in Supabase Dashboard > SQL Editor.

-- Colour / size / other product options. One product can have many variants.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  colour text not null,
  sku text unique,
  price numeric(10,2) check (price is null or price >= 0),
  compare_at_price numeric(10,2),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  gallery_urls text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (compare_at_price is null or price is null or compare_at_price >= price)
);
create index if not exists product_variants_product_idx on public.product_variants(product_id, sort_order);
alter table public.product_variants enable row level security;
drop policy if exists "Public read variants of published products" on public.product_variants;
create policy "Public read variants of published products" on public.product_variants
  for select using (exists (select 1 from public.products where products.id = product_variants.product_id and (products.status = 'published' or public.is_store_admin())));
drop policy if exists "Admins manage product variants" on public.product_variants;
create policy "Admins manage product variants" on public.product_variants
  for all using (public.is_store_admin()) with check (public.is_store_admin());

