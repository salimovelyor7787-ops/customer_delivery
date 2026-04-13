# Food Delivery Web Admin

Production-oriented admin panel built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Realtime, Storage)

## Setup

1. Copy env variables:

```bash
cp .env.example .env.local
```

2. Fill `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Install + run:

```bash
npm install
npm run dev
```

## Vercel deploy

Next.js must be deployed **from the `web_admin` folder**, otherwise the production URL returns **404**.

1. Vercel → Project → **Settings** → **General** → **Root Directory** → set to `web_admin` → Save.
2. Clear **Override** fields if you set them earlier:
   - **Output Directory** — leave **empty** (do not use `public` or `.next`).
   - **Build Command** — leave default `npm run build`, or use root scripts only if Root Directory stays the repo root (not recommended).
3. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If Root Directory is the **repository root** (`customer_delivery`), the repo includes `vercel.json` with:

- `installCommand`: `npm run install:web-admin`
- `buildCommand`: `npm run build`

That still builds Next inside `web_admin`, but Vercel’s Next.js integration works most reliably when **Root Directory = `web_admin`**.

## Role routing

After login, users are redirected by role:

- `admin` -> `/admin`
- `restaurant` -> `/restaurant`
- `courier` -> `/courier`

## Security

- Frontend route protection in `src/proxy.ts` (Next.js 16 convention)
- Server role-guard helper in `src/lib/guards.ts`
- RLS policy blueprint in `../supabase/004_admin_panel_rls.sql`

## Features included

- Admin: dashboard stats, users, restaurants, banners, promocodes, all orders with filters
- Restaurant: products CRUD with image upload, order status updates
- Courier: assigned orders, accept and deliver flow
- Realtime: live order list in admin dashboard via Supabase Realtime
