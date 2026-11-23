-- Craftycorners Supabase setup
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- Safe to re-run: tables, policies, bucket and indexes are created idempotently.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= price),
  sku text unique,
  stock integer not null default 0 check (stock >= 0),
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  gallery_urls text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill columns when upgrading from the original Craftycorners starter schema.
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists compare_at_price numeric(10,2);
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists gallery_urls text[] not null default '{}';
alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.products add column if not exists updated_at timestamptz not null default now();


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

create index if not exists products_status_created_idx on public.products(status, created_at desc);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists categories_sort_idx on public.categories(sort_order, name);

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

drop policy if exists "Admins can view own admin row" on public.admin_users;
create policy "Admins can view own admin row" on public.admin_users
  for select using (user_id = auth.uid());

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories
  for select using (true);
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
  for all using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Public read published products" on public.products;
create policy "Public read published products" on public.products
  for select using (status = 'published' or public.is_store_admin());
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all using (public.is_store_admin()) with check (public.is_store_admin());

-- Create the public product image bucket if it does not exist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public view product images" on storage.objects;
create policy "Public view product images" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "Admin upload product images" on storage.objects;
create policy "Admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists "Admin update product images" on storage.objects;
create policy "Admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_store_admin())
  with check (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists "Admin delete product images" on storage.objects;
create policy "Admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_store_admin());

-- Add default collections. These are safe to run repeatedly.
insert into public.categories (name, slug, description, sort_order) values
  ('Home Decor', 'home-decor', 'Handcrafted accents and thoughtful details for your home.', 1),
  ('Jewellery', 'jewellery', 'Expressive details, thoughtfully selected.', 2),
  ('Gifts', 'gifts', 'Meaningful gifts for the people who matter.', 3)
on conflict (slug) do nothing;

-- Admin setup:
-- 1. Create your private admin user in Supabase Authentication > Users.
-- 2. Copy that user's UUID.
-- 3. Run: insert into public.admin_users (user_id) values ('YOUR_AUTH_USER_UUID');
-- Never expose the service_role key in the browser or commit it to Git.
