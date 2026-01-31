# Docker Compose Update Summary

## Changes Made

### ✅ Removed Nginx

- **Removed services:**
  - `nginx` - nginx reverse proxy container
  - `backend-nginx` - backend service for nginx profile
  - `frontend-nginx` - frontend service for nginx profile
  
- **Removed profiles:**
  - `nginx-prod` profile completely removed
  - `prod` profile simplified and made default

### ✅ Simplified Architecture

**Before (with nginx):**
```
Client → Nginx (:80) → Frontend (:80) + Backend (:8000)
```

**After (direct access):**
```
Client → Frontend (:3000) ⟷ Backend (:8080)
```

### ✅ Updated Services

**Backend:**
- Port: `8080` (configurable via `BACKEND_PORT`)
- Image: `lambki/email-sender-backend:latest`
- CORS: Configured to allow frontend origins
- Health check: Added for service readiness
- Volumes: `db/` and `uploads/` directories

**Frontend:**
- Port: `3000` (configurable via `FRONTEND_PORT`)
- Image: `lambki/email-sender-nextjs:latest` (NEW)
- Build: Uses `frontend-nextjs/` directory (NEW)
- Environment: `NEXT_PUBLIC_BACKEND_URL` configured automatically
- Depends on: Backend health check

## Configuration

### Environment Variables (.env)

Create a `.env` file in the project root:

```env
# Frontend (Next.js) port
FRONTEND_PORT=3000

# Backend (FastAPI) port  
BACKEND_PORT=8080

# Server IP for external access
IP_ADDR=localhost
```

**For production**, set `IP_ADDR` to your server's public IP or domain name.

### CORS Configuration

The backend automatically allows:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://${IP_ADDR}:${FRONTEND_PORT}`

## Usage

### Start Services

```bash
# From project root
cd email-sender-web-app

# First time setup
cp .env.example .env
# Edit .env if needed

# Build and start services
docker compose up --build

# Or run in background
docker compose up -d --build
```

### Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080/api
- **API Docs:** http://localhost:8080/docs

### Stop Services

```bash
docker compose down
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f backend
```

### Update from Docker Hub

```bash
docker compose pull
docker compose up -d --force-recreate
```

## Benefits of This Change

1. **Simpler Setup:**
   - No nginx configuration needed
   - Fewer moving parts
   - Easier to understand and maintain

2. **Faster Development:**
   - Direct access to services
   - Easier debugging
   - Simpler CORS configuration

3. **Production Ready:**
   - Next.js handles static assets efficiently
   - Built-in production optimizations
   - Standalone output for Docker

4. **Easier Scaling:**
   - Can add nginx/load balancer later if needed
   - Services are independently scalable
   - Clear separation of concerns

## Migration from Old Setup

If you were using the old nginx-based setup:

1. **Stop old services:**
   ```bash
   docker compose --profile nginx-prod down
   ```

2. **Pull new images:**
   ```bash
   docker compose pull
   ```

3. **Start new setup:**
   ```bash
   docker compose up -d --build
   ```

4. **Update bookmarks/links:**
   - Old: `http://localhost:8080/email_sender/`
   - New: `http://localhost:3000/`

## Files Modified

- ✅ `docker-compose.yml` - Simplified, nginx removed
- ✅ `.env.example` - Updated for new setup
- ✅ `README.md` - Updated with new instructions
- ✅ `NEXTJS_MIGRATION.md` - Updated deployment section

## Files No Longer Used

- `nginx/nginx.conf` - nginx configuration (kept for reference, can be deleted)
- Old React frontend Docker configs in `frontend/` directory

## Troubleshooting

### Port already in use

If port 3000 or 8080 is already in use:

```bash
# Edit .env file
FRONTEND_PORT=3001
BACKEND_PORT=8081

# Restart services
docker compose down
docker compose up -d
```

### CORS errors

Make sure:
1. `.env` file exists with correct `IP_ADDR`
2. Access frontend via the configured address
3. Backend is running and healthy: `curl http://localhost:8080/api/health`

### Services not communicating

Check network:
```bash
docker network ls
docker network inspect email-sender-web-app_app-network
```

Both services should be on the same network.

## Production Deployment

For production servers:

1. **Set IP_ADDR:**
   ```env
   IP_ADDR=your-server-ip.com
   ```

2. **Use HTTPS (recommended):**
   Add Caddy or Traefik as reverse proxy for SSL/TLS:
   ```bash
   # Example with Caddy
   docker run -d -p 80:80 -p 443:443 \
     -v caddy_data:/data \
     caddy:latest \
     caddy reverse-proxy --from your-domain.com --to localhost:3000
   ```

3. **Configure firewall:**
   - Allow ports 3000 (frontend) and 8080 (backend)
   - Or use reverse proxy and only expose 80/443

## Summary

The docker-compose.yml has been successfully updated:
- ✅ Nginx removed completely
- ✅ Simplified to 2 services (frontend + backend)
- ✅ Next.js frontend container
- ✅ Direct access architecture
- ✅ Health checks added
- ✅ Environment-based configuration
- ✅ Production-ready

The application is now simpler, easier to maintain, and ready for deployment!
