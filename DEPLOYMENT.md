# Deployment Guide

This application supports two deployment profiles with simplified configuration using relative URLs.

## Profiles

### 1. `prod` Profile - With External Nginx Proxy
- **Frontend**: Served at `/email_sender/` via external nginx on `${NGINX_PORT}`
- **Backend API**: Served at `/email_sender/api/` via external nginx
- **Use case**: Production deployment with external nginx reverse proxy, path-based routing

### 2. `nginx-prod` Profile - With Built-in Nginx Proxy
- **Frontend**: Served at `/email_sender/` on `${NGINX_PORT}`
- **Backend API**: Served at `/email_sender/api/` on `${NGINX_PORT}`
- **Use case**: Production deployment with containerized nginx proxy, all-in-one solution

## Usage

### Running with `prod` profile (External Nginx)
```bash
# Start services
docker-compose --profile prod up -d

# Rebuild after configuration changes
docker-compose --profile prod up --build -d

# Stop services
docker-compose --profile prod down
```

**Access:**
- Frontend: `http://localhost:${NGINX_PORT}/email_sender/`
- Backend API: `http://localhost:${NGINX_PORT}/email_sender/api/`
- Also accessible via IP: `http://<your-ip>:${NGINX_PORT}/email_sender/`

**Note:** This profile requires an external nginx reverse proxy configured to route traffic to the containers.

### Running with `nginx-prod` profile (Built-in Nginx)
```bash
# Start services
docker-compose --profile nginx-prod up -d

# Rebuild after configuration changes
docker-compose --profile nginx-prod up --build -d

# Stop services
docker-compose --profile nginx-prod down
```

**Access:**
- Frontend: `http://localhost:${NGINX_PORT}/email_sender/`
- Backend API: `http://localhost:${NGINX_PORT}/email_sender/api/`
- Also accessible via IP: `http://<your-ip>:${NGINX_PORT}/email_sender/`

**Note:** This profile includes a containerized nginx proxy with pre-configured routing.

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Port mappings (only environment variables needed!)
BACKEND_PORT=8000      # For prod profile backend direct access
FRONTEND_PORT=3000     # For prod profile frontend direct access  
NGINX_PORT=8080        # For nginx proxy access (both profiles)

# Note: IP_ADDR is no longer needed! 🎉
# The application now uses relative URLs that work with any hostname.
```

**Important:** You also need a `backend/.env` file for backend-specific settings (SMTP, database, etc.)

### Simplified Configuration Benefits
- ✅ **No IP_ADDR needed** - Uses relative URLs that work with any hostname
- ✅ **Access from anywhere** - Works with localhost, IP address, or domain names
- ✅ **No rebuilding** - Same containers work regardless of access method
- ✅ **Simpler CORS** - Configured to allow all origins since traffic goes through nginx

## Service Containers

### `prod` profile containers:
- `backend` - Backend FastAPI service
  - Exposed on: `${BACKEND_PORT}:8000`
  - Requires external nginx for proxy
- `frontend` - Frontend React SPA (served via `serve`)
  - Exposed on: `${FRONTEND_PORT}:80`
  - Requires external nginx for proxy

### `nginx-prod` profile containers:
- `backend-nginx` - Backend FastAPI service (internal only)
  - Internal port: 8000
- `frontend-nginx` - Frontend React SPA (internal only)
  - Internal port: 80
- `nginx` - Nginx reverse proxy
  - Exposed on: `${NGINX_PORT}:80`
  - Routes `/email_sender/` → frontend
  - Routes `/email_sender/api/` → backend

## Architecture Notes

### How Relative URLs Work
Both profiles use relative URLs (`/email_sender/api`) instead of absolute URLs:
- Browser requests assets from the same origin it loaded from
- No hardcoded IP addresses or ports in the built containers
- Same container images work in any environment (dev, staging, prod)

### CORS Configuration
- Backend configured with `ALLOWED_ORIGIN_URLS: all`
- Safe because nginx acts as the single entry point
- All external requests go through nginx proxy
- Backend containers are not directly exposed to the internet

### Docker Networking
- All containers communicate via the `app-network` bridge network
- Containers reference each other by service name (e.g., `backend-nginx:8000`)
- Only nginx port is exposed to the host machine

## Troubleshooting

### If you get 404 errors on API calls:
```bash
# Rebuild the frontend with --no-cache
docker-compose --profile prod build --no-cache frontend
docker-compose --profile prod up -d
```

### If you get CORS errors:
- Check that you're accessing through the nginx proxy
- Verify nginx is routing correctly: `docker logs nginx-proxy`
- Ensure backend CORS is set to `all`

### To view logs:
```bash
# All services
docker-compose --profile prod logs -f

# Specific service
docker logs frontend
docker logs backend
docker logs nginx-proxy
```

### To rebuild everything:
```bash
docker-compose --profile prod down
docker-compose --profile prod build --no-cache
docker-compose --profile prod up -d
```
