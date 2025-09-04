# Codebase Structure Overview

## Root Level Structure
```
/
├── src/                    # Source code
├── tests/                  # Test files
├── public/                 # Static assets
├── docs/                   # Documentation
├── dist/                   # Build output
├── package.json            # Dependencies and scripts
├── wrangler.toml          # Cloudflare Workers config
├── biome.json             # Code quality configuration
├── playwright.config.ts   # E2E test configuration
├── vitest.config.ts       # Unit test configuration
├── tailwind.config.js     # Styling configuration
└── CLAUDE.md              # Development guide (Japanese)
```

## Source Code Organization (`src/`)

### Frontend (`src/frontend/`)
```
frontend/
├── components/            # React components
│   ├── ui/               # Reusable UI components (buttons, inputs, etc.)
│   ├── data-management/  # Data entry and management components
│   ├── timetable/        # Timetable-specific components
│   └── teacher/          # Teacher-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Frontend utilities and API clients
│   └── api/              # API client implementations
│       └── v2/           # Type-safe API v2 client
├── pages/                # Page components
├── main.tsx              # Application entry point
├── App.tsx               # Root application component
└── index.css             # Global styles
```

### Backend (`src/backend/`)
```
backend/
├── api/                  # Type-safe API v2 routes
│   └── routes/           # OpenAPI route definitions
├── routes/               # Legacy API v1 routes
├── services/             # Business logic services
│   └── timetable/        # Timetable generation algorithms
│       ├── core/         # Core timetable logic
│       └── constraints/  # Constraint checking
├── controllers/          # Request handlers
├── middleware/           # Authentication and validation
├── types/                # Backend-specific types
├── utils/                # Backend utilities
└── index.tsx             # Backend entry point
```

### Shared (`src/shared/`)
```
shared/
├── schemas.ts            # Zod schemas and type definitions
└── types.ts              # Shared TypeScript types
```

## Key Architecture Files

### Configuration Files
- **`package.json`**: NPM scripts, dependencies, and project metadata
- **`wrangler.toml`**: Cloudflare Workers deployment configuration
- **`biome.json`**: Linting and formatting rules
- **`vite.frontend.config.ts`**: Frontend build configuration
- **`vite.backend.config.ts`**: Backend build configuration

### Type Definitions
- **`src/shared/schemas.ts`**: Single source of truth for all data types
- **`src/shared/types.ts`**: Additional TypeScript type definitions
- **`tsconfig.json`**: TypeScript project references
- **`tsconfig.app.json`**: Main application TypeScript config

## Component Organization Patterns

### UI Components (`src/frontend/components/ui/`)
Reusable, generic components built on Radix UI:
- `button.tsx` - Button variants and styles
- `dialog.tsx` - Modal dialogs and overlays
- `input.tsx` - Form input components
- `select.tsx` - Dropdown select components
- `table.tsx` - Data table components

### Feature Components (`src/frontend/components/`)
Business logic components organized by feature:
- **`data-management/`** - CRUD operations for teachers, subjects, classrooms
- **`timetable/`** - Timetable display and interaction components
- **`teacher/`** - Teacher-specific functionality

### Custom Hooks (`src/frontend/hooks/`)
Reusable business logic:
- `use-teacher-api.ts` - Teacher data management
- `use-timetable-data.ts` - Timetable state management
- `use-auth.ts` - Authentication state

## API Architecture

### Legacy API v1 (`src/backend/routes/`)
Traditional REST endpoints:
- `school.ts` - School settings and basic data
- `timetableProgram.ts` - Timetable generation endpoints
- `data-cleanup.ts` - Data maintenance and repair

### Type-safe API v2 (`src/backend/api/`)
Modern OpenAPI with full type safety:
- `routes/teachers.ts` - Teacher management with Zod validation
- `routes/school-settings.ts` - Enhanced school configuration
- `openapi.ts` - OpenAPI specification generation

## Service Layer (`src/backend/services/`)

### Core Services
- **`schoolService.ts`** - School data management
- **`timetableService.ts`** - Timetable operations
- **`database.ts`** - Database connection and utilities

### Timetable Engine (`src/backend/services/timetable/`)
Advanced scheduling algorithms:
- **`core/`** - Core scheduling logic
  - `TimetableInitializer.ts` - Setup and initialization
  - `TimetableAssigner.ts` - Assignment algorithms
  - `TimetableValidator.ts` - Validation and verification
- **`constraints/`** - Constraint checking
  - `TeacherConflictChecker.ts` - Teacher scheduling conflicts
  - `ClassroomConflictChecker.ts` - Room availability checking

## Testing Structure (`tests/`)

### Unit Tests (`tests/unit/`)
Fast, isolated tests for individual components and functions:
- Component testing with React Testing Library
- Service layer testing with Vitest
- API endpoint testing with mock data

### E2E Tests (`tests/e2e/`)
Full workflow testing with Playwright:
- **`auth.setup.ts`** - Authentication setup for tests
- **`authenticated-crud.spec.ts`** - Core CRUD functionality
- **`timetable-generation.spec.ts`** - Timetable creation workflow
- **`utils/`** - Test utilities and helpers

## Build Output (`dist/`)
```
dist/
├── frontend/             # Built frontend assets
│   ├── assets/          # JavaScript, CSS, and static files
│   └── index.html       # Main HTML file
└── worker.js            # Compiled Cloudflare Worker
```

## Development Patterns

### Import Structure
```typescript
// External libraries first
import React from 'react'
import { Button } from '@radix-ui/react-button'

// Internal modules by hierarchy
import { TeacherSchema } from '@shared/schemas'
import { useTeacherApi } from '@/hooks/use-teacher-api'
import { Button } from '@/components/ui/button'
```

### File Naming Conventions
- **Components**: PascalCase with descriptive names (`TeacherEditDialog.tsx`)
- **Hooks**: camelCase with `use` prefix (`use-teacher-api.ts`)
- **Utilities**: kebab-case (`data-cleanup.ts`)
- **Types**: PascalCase for interfaces (`Teacher`, `SchoolSettings`)

### Directory Principles
- **Co-location**: Related files grouped together
- **Feature-based**: Organize by business domain, not technical layer
- **Shared dependencies**: Common code in `shared/` directory
- **Clear boundaries**: Separate concerns between frontend/backend/shared