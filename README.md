# Customer Delivery

This repository contains:

- Flutter customer app (`lib/...`) for Android/iOS/Web
- Customer website (`customer_web/...`) built with Next.js (separate deploy from admin)
- Web admin panel (`web_admin/...`) built with Next.js
- Supabase SQL and Edge Functions (`supabase/...`)

## Customer Website (Next.js)

```bash
npm run install:customer-web
npm run dev:customer-web
```

## Customer Web (Flutter)

This is the Flutter app running in the browser. It is useful when you want the closest possible match to the mobile implementation without maintaining a separate web UI.

### Run locally in browser

```bash
npm run web:run
```

This starts Flutter on Chrome.

### Build production static website

```bash
npm run web:build
```

Production files will be generated into:

```text
flutter_web_deploy/
```

### Serve built website locally

```bash
npm run web:serve
```

Website will be available on:

```text
http://localhost:4173
```

## Admin Panel

```bash
npm run install:web-admin
npm run dev
```

Admin panel runs from `web_admin`.
