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

Next.js must be deployed **from the `web_admin` folder**, otherwise the production URL often returns **404**.

1. Vercel → Project → **Settings** → **General** → **Root Directory** → **`web_admin`** → Save.
2. **Settings** → **Build & Development** — remove overrides that break subfolder installs:
   - **Install Command** — leave **empty** (default `npm install` inside `web_admin`).
   - **Build Command** — leave **empty** (default `npm run build` from `web_admin/package.json`).
   - **Output Directory** — leave **empty** (never `public` or `.next` for Next.js on Vercel).
3. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Why `npm run install:web-admin` fails:** that script lives in the **parent** `package.json`. It only works when the project root on Vercel is the repo root, not `web_admin`. With **Root Directory = `web_admin`**, use the defaults above.

**Alternative (repo root as Vercel root):** leave Root Directory empty, then set **Install Command** to `npm run install:web-admin` and **Build Command** to `npm run build` in the Vercel UI (not recommended; Next.js preset works best with Root = `web_admin`).

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
