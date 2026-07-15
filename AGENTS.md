# Agent Guide: Email Sender Web Application

## Project Overview

Full-stack email management application with FastAPI backend and React frontend.
- **Backend:** Python 3.11+ with FastAPI, SQLAlchemy, Alembic
- **Frontend:** React 18.3 with Material-UI, React Router
- **Database:** SQLite (via SQLAlchemy)
- **Deployment:** Docker Compose with Nginx reverse proxy

---

## Build, Test, and Run Commands

### Backend (Python/FastAPI)
```bash
# Navigate to backend directory first
cd email-sender-web-app/backend

# Install dependencies (Poetry)
poetry install

# Run development server
python main.py

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Run tests (if tests exist)
pytest

# Run single test file
pytest tests/test_specific.py

# Run single test function
pytest tests/test_file.py::test_function_name
```

### Frontend (Next.js)
```bash
# Navigate to frontend directory first
cd email-sender-web-app/frontend-nextjs

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Note: Tests to be migrated from old React frontend
```

### Frontend (Legacy React - being migrated)
```bash
# Navigate to old frontend directory
cd email-sender-web-app/frontend

# Install dependencies
npm install

# Start development server (opens browser)
npm start

# Run all tests in watch mode
npm test

# Run tests in CI mode (no watch)
CI=true npm test

# Run specific test file
npm test -- App.test.js

# Build for production
npm build
```

### Docker (Production)
```bash
# From project root
cd email-sender-web-app

# Build and start all services
docker compose up --build

# Start detached
docker compose up -d

# Update from Docker Hub
docker compose pull
docker compose up -d --force-recreate

# Stop all services
docker compose down
```

---

## Code Style Guidelines

### Python (Backend)

**General Principles:**
- Follow PEP 8 strictly
- Use meaningful, descriptive names
- Keep functions and classes short and focused
- **ALWAYS use type hints** for function parameters and return types

**Formatting:**
- 4 spaces per indentation (no tabs)
- Limit lines to 79 characters
- Use blank lines to separate functions and classes
- Spaces around operators and after commas

**Naming Conventions:**
```python
# Variables and functions: snake_case
user_email = "example@example.com"
def send_email(recipient: str) -> bool:
    pass

# Constants: UPPER_CASE
MAX_RETRIES = 3
UPLOAD_FOLDER = "uploads"

# Classes: PascalCase
class EmailSender:
    pass

# Private attributes/methods: _prefix
def _internal_helper():
    pass

# Name mangling (strongly private): __prefix
class MyClass:
    def __private_method(self):
        pass
```

**Imports:**
- Use absolute imports (not relative)
- Order: standard library → third-party → local imports
- Group imports with blank lines between groups
```python
# Standard library
import os
from pathlib import Path
from typing import List, Optional

# Third-party
from fastapi import FastAPI, HTTPException
from sqlalchemy.orm import Session

# Local
from config import Config
from db import get_db
from schemas import EmailRequest
```

**Type Hints (MANDATORY):**
```python
from typing import List, Optional

def process_emails(emails: List[str], limit: Optional[int] = None) -> bool:
    """Process a list of email addresses."""
    pass

# Use Pydantic EmailStr for email validation
from pydantic import EmailStr

def validate_email(email: EmailStr) -> bool:
    pass
```

**Docstrings & Comments:**
- Use triple double-quotes (`"""..."""`) for all docstrings
- Start with one-line summary, then blank line, then details
- Keep inline comments minimal and meaningful
```python
def send_email(recipient: str, subject: str) -> dict:
    """
    Send an email to a single recipient.
    
    Args:
        recipient: Email address of the recipient
        subject: Email subject line
        
    Returns:
        dict with 'success' boolean and 'message' string
    """
    pass
```

**Error Handling:**
- Use `try-except` blocks wisely
- **Avoid catching generic exceptions** (`except Exception` only when necessary)
- Use `logging` instead of `print()` for all output
- Re-raise or use HTTPException in FastAPI routes
```python
import logging

logger = logging.getLogger(__name__)

try:
    result = send_email(recipient)
except SMTPException as e:
    logger.error(f"SMTP error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail=str(e))
```

**Functions & Methods:**
- Keep functions short and single-purpose
- **NEVER use mutable default arguments** (list, dict)
```python
# BAD
def add_item(item, items=[]):  # Dangerous!
    items.append(item)
    
# GOOD
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
```

**Performance & Security:**
- Use list comprehensions when appropriate
- Avoid hardcoded secrets (use environment variables)
- Validate all user inputs (Pydantic schemas)
- Keep dependencies updated

### TypeScript/Next.js (Frontend)

**Naming Conventions:**
```typescript
// Components: PascalCase
function EmailSenderPage() {}
const FileUpload = () => {}

// Variables and functions: camelCase
const userEmail = "test@example.com";
const handleSubmit = () => {};

// Constants: UPPER_CASE
const BACKEND_URL = "http://localhost:8080";
const MAX_FILE_SIZE = 10485760;

// Interfaces and Types: PascalCase
interface UploadedFile {
  name: string;
  path: string;
}

type StatusType = "success" | "error" | "pending";

// File names: PascalCase for components, camelCase for utilities
// EmailSenderPage.tsx, FileUpload.tsx, config.ts, utils.ts
```

**Type Safety:**
- **ALWAYS use TypeScript types** for all function parameters and return values
- Use interface for object shapes
- Use type for unions, primitives, and aliases
- Avoid `any` - use `unknown` if type is truly unknown

**Imports:**
- Group imports: React → third-party → local components → local utilities
- Use relative imports in Next.js app directory
```typescript
// React imports first
import React, { useState, useEffect } from "react";

// Third-party libraries
import { Container, Typography, Box } from "@mui/material";
import axios from "axios";

// Local components
import EmailForm from "./components/EmailForm";
import StatusDisplay from "./components/StatusDisplay";

// Local utilities/config
import { BACKEND_URL } from "./api/config";
```

**Component Structure:**
- Functional components with hooks (no class components)
- TypeScript interfaces for props
- Use "use client" directive for interactive components
```typescript
"use client";

interface EmailFormProps {
  onSubmit: (data: EmailFormData, filter: string) => void;
  disabled: boolean;
}

/**
 * EmailForm component for composing emails
 */
function EmailForm({ onSubmit, disabled }: EmailFormProps) {
  // Implementation
}
```

**Async Patterns:**
- Prefer `async/await` over `.then()` chains
- Always handle errors in async functions
```javascript
const fetchData = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/data`);
    setData(response.data);
  } catch (error) {
    console.error("Error fetching data:", error);
    setError(error.message);
  }
};
```

**Error Handling:**
- Use try-catch for async operations
- Display user-friendly error messages (MUI Alert components)
- Log errors to console with context

---

## Project-Specific Conventions

### API Routes (Backend)
All API routes are prefixed with `/api/`:
- `GET /api/health` - Health check
- `POST /api/upload` - Upload files
- `POST /api/send-email` - Send email
- `GET /api/email-history` - Get email history
- `GET /api/addresses` - List addresses
- `POST /api/addresses` - Create address
- `PUT /api/addresses/{id}` - Update address
- `DELETE /api/addresses/{id}` - Delete address
- `GET /api/files` - List uploaded files
- `DELETE /api/files` - Delete files

### Database Models
- Use SQLAlchemy ORM models in `db.py`
- Pydantic schemas in `schemas.py` for validation
- Alembic for migrations (never modify database directly)

### Environment Variables
- Backend uses `.env` file (see `.env.example`)
- Frontend uses `REACT_APP_` prefix for env vars
- Never commit `.env` files (already in `.gitignore`)

### File Upload Handling
- Files stored in `uploads/` directory
- Automatic cleanup after 30 days
- Filenames sanitized to alphanumeric + `._- `

### Logging
- Backend uses structured logging (see `logger_config.py`)
- Use `logger.info()`, `logger.error()`, `logger.debug()` appropriately
- Never use `print()` in production code

---

## Common Tasks for Agents

### Adding a New API Endpoint
1. Add route handler in `backend/main.py`
2. Create/update Pydantic schema in `backend/schemas.py`
3. Update database model in `backend/db.py` if needed
4. Create migration: `alembic revision --autogenerate -m "description"`
5. Run migration: `alembic upgrade head`

### Adding a New Frontend Page (Next.js)
1. Create directory in `frontend-nextjs/app/page-name/`
2. Create `page.tsx` file in that directory
3. Add "use client" directive if page uses interactivity
4. Navigation is automatic via Next.js Link in layout
5. Import required MUI components

### Modifying Database Schema
1. Update model in `backend/db.py`
2. Update schema in `backend/schemas.py`
3. Generate migration: `alembic revision --autogenerate -m "description"`
4. Review generated migration in `backend/alembic/versions/`
5. Apply migration: `alembic upgrade head`

### Testing Changes
- Frontend (Next.js): `npm run dev` then test in browser at http://localhost:3000
- Backend: `pytest` (if tests exist) or `python main.py`
- Integration: Run both frontend (`npm run dev`) and backend (`python main.py`), test via browser
- Production build: `npm run build && npm start`

---

## Important Notes

- **Type Safety:** Always use type hints in Python, TypeScript types in frontend
- **Never suppress errors:** No empty `except:` blocks, no silent failures
- **Logging over printing:** Use `logging` module (Python) or `console.error` (TS/Next.js)
- **Validate inputs:** Use Pydantic schemas for all API inputs
- **CORS:** Backend allows configurable origins via `ALLOWED_ORIGIN_URLS` env var
- **Security:** Never commit secrets, always use environment variables
