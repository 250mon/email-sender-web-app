# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack email management application with bulk email sending, address book, file attachments, and email history tracking.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py                    # Runs uvicorn on port 8080
# Or with Poetry:
poetry install && poetry run uvicorn main:app --reload
```

### Frontend (Next.js)
```bash
cd frontend-nextjs
npm install
npm run dev      # Dev server on port 3000
npm run build    # Production build
npm run lint     # ESLint checks
```

### Docker
```bash
docker compose up --build         # Build and start both services
docker compose up -d --build      # Background mode
docker compose logs -f            # View logs
```

## Architecture

```
backend/                    # FastAPI Python (port 8080)
├── main.py                # API endpoints
├── db.py                  # SQLAlchemy models (Address, EmailHistory)
├── schemas.py             # Pydantic validation
├── email_sender.py        # SMTP email logic
├── config.py              # Environment config
└── db/email.db            # SQLite database

frontend-nextjs/           # Next.js 16 TypeScript (port 3000)
├── app/
│   ├── page.tsx           # Email sender (home)
│   ├── files/page.tsx     # File manager
│   ├── address-book/page.tsx
│   ├── history/page.tsx
│   ├── components/        # EmailForm, FileUpload, StatusDisplay
│   └── api/config.ts      # Backend URL config
```

## API Endpoints

Base: `http://localhost:8080/api`

- `POST /api/upload` - Upload files
- `POST /api/send-email` - Send email with attachments
- `GET /api/email-history` - Query history (filters: recipient, subject, status, date range)
- `GET /api/addresses`, `POST`, `PUT /{id}`, `DELETE /{id}` - Address CRUD
- `GET /api/active-addresses` - Active addresses only
- `GET /api/files`, `DELETE /api/files` - File management
- `GET /api/health` - Health check

## Database Schema

**addresses**: id, name, email, status (active/inactive), created_at, updated_at
**email_history**: id, recipient_name, recipient_email, subject, files (JSON), status (success/error), message, created_at, updated_at

## Environment Setup

Root `.env`:
```env
FRONTEND_PORT=3000
BACKEND_PORT=8080
IP_ADDR=localhost
```

Backend `backend/.env`:
```env
SECRET_KEY=your-secret-key
DATABASE_FILE_NAME=email.db
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
BACKEND_DEBUG=true
```

## Code Style

**Python**: PEP 8, snake_case, type hints, `logging` over `print()`, 79 char line limit
**TypeScript**: PascalCase for components, camelCase for functions, `"use client"` for interactive components

## Key Implementation Details

- File uploads sanitized for directory traversal; supports Unicode filenames
- 30-day automatic cleanup of uploaded files (triggered after email sends)
- SMTP with TLS; RFC 2231 encoding for non-ASCII attachment names
- CORS configured via `ALLOWED_ORIGIN_URLS` in docker-compose.yml
- Frontend uses Material-UI 7; standalone Next.js output for Docker
- **NEXT_PUBLIC_* variables are build-time only** - must be passed as Docker build `args`, not runtime `environment`
