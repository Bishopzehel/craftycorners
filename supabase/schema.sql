-- Craftycorners production catalogue + admin authorization
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, description text, created_at timestamptz not null default now()
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text,
 price numeric(10,2) not null check(price>=0), compare_at_price numeric(10,2), sku text unique,
 stock integer not null default 0 check(stock>=0), category_id uuid references public.categories(id) on delete set null,
 image_url text, gallery_urls text[] not null default '{}',
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
create or replace function public.is_store_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
drop policy if exists "Public read published products" on public.products;
drop policy if exists "Public read categories" on public.categories;
create policy "Public read published products" on public.products for select using(status='published' or public.is_store_admin());
create policy "Public read categories" on public.categories for select using(true);
create policy "Admins manage products" on public.products for all using(public.is_store_admin()) with check(public.is_store_admin());
create policy "Admins manage categories" on public.categories for all using(public.is_store_admin()) with check(public.is_store_admin());
-- Create a PRIVATE admin account in Supabase Auth first, then register its UUID:
-- insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');
-- Product images bucket: create a PUBLIC bucket named "product-images" in Storage UI.
-- Storage policies restrict uploads/deletes to admin users; product images are publicly readable.
drop policy if exists "Admin upload product images" on storage.objects;
drop policy if exists "Admin update product images" on storage.objects;
drop policy if exists "Admin delete product images" on storage.objects;
drop policy if exists "Public view product images" on storage.objects;
create policy "Public view product images" on storage.objects for select using(bucket_id='product-images');
create policy "Admin upload product images" on storage.objects for insert with check(bucket_id='product-images' and public.is_store_admin());
create policy "Admin update product images" on storage.objects for update using(bucket_id='product-images' and public.is_store_admin()) with check(bucket_id='product-images' and public.is_store_admin());
create policy "Admin delete product images" on storage.objects for delete using(bucket_id='product-images' and public.is_store_admin());

create policy "Admins can view own admin row" on public.admin_users for select using(user_id=auth.uid());
