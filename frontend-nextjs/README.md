# Next.js Frontend

This is the Next.js migration of the email sender frontend application.

## Getting Started

### Development Mode

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local and set NEXT_PUBLIC_BACKEND_URL if needed
# Default: http://127.0.0.1:8080/api

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend-nextjs/
├── app/
│   ├── page.tsx              # Home page (Email Sender)
│   ├── layout.tsx            # Root layout with navigation
│   ├── theme.ts              # Material-UI theme
│   ├── api/
│   │   └── config.ts         # API configuration
│   ├── components/
│   │   ├── EmailForm.tsx     # Email composition form
│   │   ├── FileUpload.tsx    # File upload component
│   │   └── StatusDisplay.tsx # Status display component
│   ├── files/
│   │   └── page.tsx          # Files manager page
│   ├── address-book/
│   │   └── page.tsx          # Address book page
│   └── history/
│       └── page.tsx          # Email history page
├── public/                   # Static assets
└── package.json
```

## Features

- **Next.js 15+** with App Router
- **TypeScript** for type safety
- **Material-UI (MUI)** for UI components
- **Server-Side Rendering** (SSR) capabilities
- **Optimized production builds** with automatic code splitting

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8080/api
```

## Docker Deployment

```bash
# Build Docker image
docker build -t email-sender-nextjs .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BACKEND_URL=http://your-backend-url/api \
  email-sender-nextjs
```

## Migration from React

This application was migrated from Create React App to Next.js. Key changes:

- **File structure:** Pages are now in `app/` directory with `page.tsx` files
- **Routing:** Next.js App Router instead of React Router
- **TypeScript:** Full TypeScript support with proper types
- **"use client" directive:** Required for interactive components
- **Server components:** Default to server components, opt-in to client components
- **Improved performance:** Automatic code splitting and optimization

## Backend Integration

The frontend connects to the FastAPI backend via the `NEXT_PUBLIC_BACKEND_URL` environment variable.

API endpoints used:
- `GET /api/health` - Health check
- `POST /api/upload` - File uploads
- `POST /api/send-email` - Send emails
- `GET /api/email-history` - Email history
- `GET /api/addresses` - Address book CRUD
- `GET /api/files` - File management

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Documentation](https://mui.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
