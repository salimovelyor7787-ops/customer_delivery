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

## Vercel deploy (from repo root)

This repository now includes root scripts and `vercel.json`, so you can connect the repository as-is.

- Root build command: `npm run build`
- Root install command: `npm run install:web-admin`
- Env vars in Vercel Project Settings:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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
