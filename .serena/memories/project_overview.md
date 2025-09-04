# School Timetable Monorepo - Project Overview

## Purpose
A comprehensive school timetable management application that allows educational institutions to manage teachers, subjects, classrooms, and automatically generate optimized timetables with constraint validation.

## Core Features
- **Data Management**: Teachers, subjects, classrooms, and school settings
- **Timetable Generation**: Automated scheduling with constraint validation
- **Authentication**: Clerk-based user management
- **Real-time Validation**: Type-safe API communication
- **Responsive UI**: Modern React-based interface

## Architecture
Full-stack monorepo running entirely on Cloudflare Workers with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Hono API framework
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Clerk.dev
- **Deployment**: Single Cloudflare Workers deployment

## Tech Stack

### Frontend
- **React 19.1.0** - Modern React with concurrent features
- **TypeScript** - Full type safety
- **Vite** - Fast build tooling
- **React Router DOM** - Client-side routing
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **@dnd-kit** - Drag and drop functionality

### Backend  
- **Hono 4.8.3** - Lightweight web framework for Workers
- **Drizzle ORM** - Type-safe database ORM
- **Zod** - Runtime type validation
- **@hono/zod-openapi** - OpenAPI integration with type safety
- **Jose/JWT** - Authentication handling

### Development Tools
- **Biome** - Fast linter and formatter (replaces ESLint + Prettier)
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing
- **Wrangler** - Cloudflare Workers CLI
- **TypeDoc** - Documentation generation

## Project Structure
```
/
├── src/
│   ├── frontend/          # React application
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Frontend utilities and API clients
│   │   └── pages/         # Page components
│   ├── backend/           # Hono API backend
│   │   ├── api/           # Type-safe API v2 routes
│   │   ├── routes/        # Legacy API v1 routes
│   │   ├── services/      # Business logic
│   │   ├── controllers/   # Request handlers
│   │   └── middleware/    # Authentication & validation
│   ├── shared/            # Shared types and schemas
│   └── worker.ts          # Workers entry point
├── tests/
│   ├── unit/              # Unit tests (Vitest)
│   └── e2e/               # E2E tests (Playwright)
├── public/                # Static assets
└── dist/                  # Build output
```

## Key Design Patterns
- **Type Safety**: End-to-end TypeScript with Zod validation
- **Shared Schemas**: Single source of truth for data types
- **API Versioning**: Legacy v1 and modern type-safe v2 APIs
- **Component Composition**: Radix UI + custom components
- **Monorepo Architecture**: Unified codebase with shared dependencies
- **Zero-Trust Validation**: All data validated at boundaries