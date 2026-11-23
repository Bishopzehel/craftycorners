# Craftycorners — Supabase setup

The storefront reads published products from Supabase. The private Product Studio creates products and uploads their photos.

## 1. Run the database setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Open `schema.sql` from this folder in the repository.
4. Paste the complete contents into a new SQL query and click **Run**.
5. Confirm that the `categories`, `products`, and `admin_users` tables exist under **Table Editor**.
6. Under **Storage**, confirm that a public bucket named `product-images` exists. The SQL script creates it and configures its image MIME types and policies.

The SQL is designed to work both on a fresh project and on the original Craftycorners starter schema. It can be run again safely.

## 2. Configure the Next.js environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the Project URL and publishable/anon key from **Project Settings → API**. Add the same two variables to your hosting provider's environment settings, then redeploy.

**Never put the Supabase service_role/secret key in a NEXT_PUBLIC variable or commit it to Git.**

## 3. Create the store administrator

1. In Supabase, open **Authentication → Users**.
2. Add the private administrator account with an email and a strong password.
3. Copy the user's UUID.
4. In SQL Editor, run the following after replacing the placeholder:

```sql
insert into public.admin_users (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

5. Open `/admin/login` on the website and sign in with that account.

Only UUIDs present in `admin_users` are authorized to manage the catalogue.

## 4. Add products

In **Product Studio** at `/admin`, add the product name, selling price, optional compare-at price, SKU, stock, collection, description and one or more photos. The first photo is the cover image. New products are saved as **drafts**; publish them when they are ready to appear in the shop.

The starter collections are Home Decor, Jewellery and Gifts. You can manage category records in the Supabase Table Editor.

## 5. Before launch

- Add real product photographs and verify image cropping on mobile.
- Confirm Row Level Security is enabled and the policies in `schema.sql` are present.
- Test a draft product, a published product, and a non-admin login.
- Configure payment and shipping providers before accepting online payments or promising delivery rates.
