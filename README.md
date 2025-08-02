# School Timetable Monorepo

A monorepo implementation of the school timetable application, running entirely on Cloudflare Workers.

## Architecture

This monorepo combines the previously separate frontend and backend repositories:
- **Frontend**: React/TypeScript application (previously on Cloudflare Pages)
- **Backend**: Hono-based API (previously on Cloudflare Workers)
- **Database**: Cloudflare D1 (school-timetable-db2)

Everything now runs on Cloudflare Workers with static asset serving.

## Project Structure

```
/
├── src/
│   ├── frontend/          # React frontend code
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Frontend utilities
│   │   └── pages/         # Page components
│   ├── backend/           # Hono API backend
│   │   ├── routes/        # API routes
│   │   ├── lib/           # Backend utilities
│   │   └── db/            # Database schema
│   ├── shared/            # Shared types and utilities
│   └── worker.ts          # Main Workers entry point
├── public/                # Static assets
├── migrations/            # Database migrations
└── dist/                  # Build output
    ├── frontend/          # Built frontend assets
    └── worker.js          # Built worker
```

## Getting Started

### Prerequisites

1. Node.js 18+
2. Wrangler CLI (`npm install -g wrangler`)
3. Cloudflare account with Workers and D1 enabled

### Installation

```bash
npm install
```

### Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

This starts:
- Frontend dev server on http://localhost:5173
- Backend worker on http://localhost:8787

The frontend proxies API requests to the backend worker.

### Database Setup

1. Create a new D1 database:
```bash
wrangler d1 create school-timetable-db2
```

2. Update `wrangler.toml` with your database ID:
```toml
database_id = "your-database-id-here"
```

3. Run migrations:
```bash
npm run db:push
```

### Building

Build both frontend and backend:

```bash
npm run build
```

This creates:
- `dist/frontend/` - Static frontend assets
- `dist/worker.js` - Compiled worker

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Scripts

- `npm run dev` - Start both frontend and backend in development
- `npm run dev:frontend` - Start only frontend dev server
- `npm run dev:backend` - Start only backend worker
- `npm run build` - Build both frontend and backend
- `npm run build:frontend` - Build only frontend
- `npm run build:backend` - Build only backend
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Apply database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run lint` - Run linter
- `npm run test` - Run tests

## Configuration

### Environment Variables

Set these in `wrangler.toml`:

```toml
[vars]
GROQ_API_KEY = "your-groq-api-key"
AUTH0_DOMAIN = "your-auth0-domain"
AUTH0_AUDIENCE = "your-auth0-audience"
AUTH0_CLIENT_ID = "your-auth0-client-id"
VITE_CLERK_PUBLISHABLE_KEY = "your-clerk-key"
NODE_ENV = "production"
```

### Database

Update the database ID in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "school-timetable-db2"
database_id = "your-database-id"
```

## Migration from Multi-repo

This monorepo was created by combining:
- Frontend: `/home/malah/LocalRegistries/school-timetable-frontend`
- Backend: `/home/malah/LocalRegistries/school-timetable-backend`

Key changes:
1. **Single deployment**: Everything runs on Workers instead of Pages + Workers
2. **Unified database**: Uses `school-timetable-db2` to avoid conflicts
3. **Shared types**: Common types moved to `src/shared/`
4. **Simplified API**: Frontend calls `/api/*` instead of external URLs

## Development Notes

- The worker serves both API routes (`/api/*`) and static frontend assets
- Frontend routes are handled by React Router with SPA fallback
- Database migrations are managed by Drizzle Kit
- CORS is handled at the worker level
- Static assets are served directly from the worker in production