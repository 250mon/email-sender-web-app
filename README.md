# Email Sender Web Application

Full-stack email management application with FastAPI backend and Next.js frontend.

## Quick Start

### Development Mode

Launch the frontend and backend separately:

**Backend:**
```bash
cd backend
python main.py
```

**Frontend:**
```bash
cd frontend-nextjs
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

### Production Mode (Docker)

Launch both services together using Docker Compose:

```bash
# 1. Create .env file from example
cp .env.example .env

# 2. Edit .env and set IP_ADDR to your server IP
# For local testing, leave as localhost

# 3. Build and start services
docker compose up --build

# Or run in background
docker compose up -d --build
```

Access the application at:
- Frontend: http://localhost:3000 (or http://YOUR_IP:3000)
- Backend API: http://localhost:8080/api

## Update from Docker Hub

```bash
docker compose pull
docker compose up -d --force-recreate
```

## Architecture

- **Frontend:** Next.js 16 with TypeScript and Material-UI
- **Backend:** FastAPI (Python 3.11+) with SQLAlchemy
- **Database:** SQLite
- **Deployment:** Docker Compose

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3000 | User interface |
| Backend (FastAPI) | 8080 | REST API and email sending |

## Environment Variables

Create a `.env` file in the project root:

```env
# Frontend port
FRONTEND_PORT=3000

# Backend port
BACKEND_PORT=8080

# Server IP for external access
IP_ADDR=localhost
```

## Project Structure

```
email-sender-web-app/
├── frontend-nextjs/     # Next.js frontend
├── backend/             # FastAPI backend
├── docker-compose.yml   # Docker orchestration
└── .env                 # Environment configuration
```

## Features

- Email sending with file attachments
- Address book management (CRUD)
- Email history tracking
- File upload/management
- Bulk email sending with recipient filtering
- Email confirmation dialogs

## Documentation

- [Frontend README](frontend-nextjs/README.md) - Next.js setup and development
- [Migration Guide](NEXTJS_MIGRATION.md) - React to Next.js migration details
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Code Guidelines](../AGENTS.md) - Code style and conventions

## Development

See individual service READMEs for detailed development instructions:
- [Backend Development](backend/README.md)
- [Frontend Development](frontend-nextjs/README.md)

## License

See LICENSE file for details.
