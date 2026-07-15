# Deployment Guide

This application deploys as two containers — `backend` (FastAPI) and
`frontend` (Next.js) — that sit behind an **external reverse proxy**
(`danaul-caddy`) on a shared Docker network. There is no nginx and no
docker-compose profiles; `docker compose up` always starts both services.

## Architecture

```
Internet → danaul-caddy (external, not part of this repo) → edge network
                                                                 ├── frontend (Next.js, :3000)
                                                                 └── backend  (FastAPI, :8000 → BACKEND_PORT)
```

- Both services join the **`edge`** Docker network, which is declared
  `external: true` in `docker-compose.yml` — it must already exist and be
  the same network danaul-caddy is attached to. Create it once with:
  ```bash
  docker network create edge
  ```
- The frontend calls the backend directly at `NEXT_PUBLIC_BACKEND_URL`
  (baked in at build time — no proxying through the frontend container).
- The backend allows browser requests only from origins listed in
  `ALLOWED_ORIGIN_URLS` (CORS).
- Caddy is configured and run separately (outside this repo) to route the
  public domain to the `email-sender-frontend` / `email-sender-backend`
  container names on the `edge` network.

## Usage

```bash
# 1. Create your .env file
cp .env.example .env

# 2. Edit .env — see "Environment Variables" below

# 3. Build and start services
docker compose up --build -d

# Stop services
docker compose down

# View logs
docker compose logs -f
```

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
# Host ports the containers are published on
FRONTEND_PORT=3000
BACKEND_PORT=8080

# Hostname/IP used ONLY to derive the two vars below for local/LAN access
# (e.g. testing from another device on your network). Ignored once
# NEXT_PUBLIC_BACKEND_URL / ALLOWED_ORIGIN_URLS are set explicitly.
LOCAL_HOST=localhost

# Full public URL the browser calls for the backend API. Baked into the
# frontend at build time, so changing this requires a rebuild.
# Behind danaul-caddy: NEXT_PUBLIC_BACKEND_URL=https://emailsender.kdocai.com/api
#NEXT_PUBLIC_BACKEND_URL=

# Origins allowed to call the backend (CORS), comma-separated.
# Behind danaul-caddy: ALLOWED_ORIGIN_URLS=http://localhost:3000,http://127.0.0.1:3000,https://emailsender.kdocai.com
#ALLOWED_ORIGIN_URLS=
```

- **Local/LAN use**: leave `NEXT_PUBLIC_BACKEND_URL` and
  `ALLOWED_ORIGIN_URLS` unset — they default to
  `http://${LOCAL_HOST}:${BACKEND_PORT}/api` and
  `http://${LOCAL_HOST}:${FRONTEND_PORT}` respectively (see
  `docker-compose.yml`).
- **Behind danaul-caddy**: set both explicitly to the public `https://`
  domain, as shown above. `LOCAL_HOST` is not used in this case.

**Important:** You also need a `backend/.env` file for backend-specific
settings (SMTP, database — see `CLAUDE.md`).

## Service Containers

- `backend` (`email-sender-backend`) — FastAPI, published on
  `${BACKEND_PORT:-8080}` → container port 8000. Health-checked via
  `GET /api/health`.
- `frontend` (`email-sender-frontend`) — Next.js, published on
  `${FRONTEND_PORT:-3000}`. Waits for backend health before starting.

Both are also reachable inside the `edge` network by their container name
(`email-sender-backend`, `email-sender-frontend`), which is how Caddy
routes to them.

## Troubleshooting

### CORS errors
- Confirm `ALLOWED_ORIGIN_URLS` includes the exact origin the browser is
  loading the frontend from (scheme + host + port).
- Behind Caddy, this must be the public `https://` origin, not `localhost`.

### Frontend calling the wrong backend URL
- `NEXT_PUBLIC_BACKEND_URL` is compiled into the frontend at **build**
  time. After changing it, rebuild: `docker compose up --build -d frontend`.

### `edge` network not found
```bash
docker network create edge
```
Then re-run `docker compose up -d`. Caddy must also be attached to this
same network to route traffic to the containers.

### To rebuild everything
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```
