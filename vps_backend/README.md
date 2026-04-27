# VPS Backend (Production Setup)

## What is included
- Express + TypeScript API (`localhost:8080`) behind NGINX.
- PostgreSQL with pooled connections and transaction-safe order creation.
- Redis + BullMQ with retries, exponential backoff and dead-letter queue.
- JWT auth, `helmet`, strict body size, CORS allow-list.
- Structured logs (`pino`), request id (`x-request-id`), `/health` and `/metrics`.

## Main endpoints
- `POST /orders` (rate-limited and deduplicated by `request_id`)
- `GET /orders`, `GET /orders/:id`
- `GET /restaurants`, `GET /menu`
- `POST /auth/register`, `POST /auth/login`, `GET /users/me`
- `GET /health`, `GET /metrics`

## NGINX
Use `deploy/nginx.conf` with:
- reverse proxy to `127.0.0.1:8080`
- TLS, gzip, keepalive
- security headers
- global rate limit + extra strict limit for `/orders`
- basic connection limits (DDoS mitigation)
- short GET cache headers

## HTTPS (Certbot)
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/api.myapp.uz.conf
sudo ln -s /etc/nginx/sites-available/api.myapp.uz.conf /etc/nginx/sites-enabled/api.myapp.uz.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.myapp.uz --redirect --agree-tos -m you@myapp.uz
sudo systemctl enable certbot.timer
sudo systemctl status certbot.timer
```

Auto-renew test:
```bash
sudo certbot renew --dry-run
```

## PM2 (production)
```bash
npm ci
npm run build
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`ecosystem.config.cjs` already includes:
- cluster mode for API (`instances: "max"`)
- autorestart and restart limits
- `max_memory_restart`
- separate API/worker log files

## PostgreSQL hardening
### Indexes for hot paths
Defined in `src/db/schema.sql`:
- `orders(status, created_at desc)`
- `orders(restaurant_id, created_at desc)`
- `order_items(order_id)`

### Pooling
Configured in `src/db/pool.ts`:
- `DATABASE_POOL_MAX`, `DATABASE_POOL_MIN`
- `connectionTimeoutMillis`, `idleTimeoutMillis`
- query and statement timeout

### Postgres config recommendations (8 GB VPS baseline)
- `shared_buffers = 2GB` (~25% RAM)
- `work_mem = 16MB` (watch concurrency; too high can OOM)
- `max_connections = 200` (use app pool, avoid very high value)

## Redis anti-spam for `POST /orders`
- Rate limit: max `5` requests / `10s` (per user or per IP).
- Deduplication: temporary lock by `request_id` (`15s` TTL) to stop duplicate submits.
- DB idempotency remains final safety via unique `client_request_id` index.

## Queue hardening
- BullMQ attempts: `5`
- Exponential backoff: `2s, 4s, 8s, ...`
- Dead-letter queue: `order-events-dlq`

## Security checklist
- `helmet` enabled.
- CORS allow-list via `CORS_ORIGIN` env.
- JSON body limit via `BODY_LIMIT` env.
- SQL injection risk minimized (prepared statements/placeholders in service queries).

## Deploy step-by-step (VPS)
1. Install dependencies: Node 20+, PostgreSQL, Redis, NGINX.
2. Clone repo and create `.env` from `.env.example`.
3. Apply DB schema: `psql "$DATABASE_URL" -f src/db/schema.sql`.
4. Build and start app with PM2.
5. Install NGINX config from `deploy/nginx.conf`.
6. Issue SSL cert with Certbot.
7. Open firewall ports `80/443` only (keep `8080` local/private).
8. Validate:
   - `curl https://api.myapp.uz/health`
   - `curl https://api.myapp.uz/metrics`
   - place test order with unique `request_id`.
