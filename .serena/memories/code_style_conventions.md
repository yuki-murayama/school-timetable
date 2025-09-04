# Code Style and Conventions

## Biome Configuration
The project uses **Biome** as the primary code quality tool, replacing ESLint and Prettier for better performance.

### Linting Rules
- **No explicit `any`**: Error level - all types must be properly defined
- **No unused variables**: Error level - clean code enforcement
- **No unused imports**: Error level - bundle size optimization
- **Use const**: Error level - prefer immutable bindings
- **Use template literals**: Error level - modern string formatting
- **No non-null assertions**: Warning level - prefer safe type checking

### Formatting Standards
- **Indentation**: 2 spaces (no tabs)
- **Line width**: 100 characters maximum
- **Line ending**: LF (Unix-style)
- **Quote style**: Single quotes for JavaScript/TypeScript
- **JSX quotes**: Single quotes
- **Semicolons**: As needed (automatic insertion)
- **Trailing commas**: ES5 style
- **Bracket spacing**: Enabled
- **Arrow parentheses**: As needed

## TypeScript Conventions

### Type Safety
- **Strict mode enabled**: All TypeScript strict checks
- **No `any` types**: Use proper type definitions or `unknown`
- **Shared types**: All types defined in `src/shared/` for reuse
- **Zod validation**: Runtime type checking for all API boundaries

### Naming Conventions
- **Variables**: camelCase (`userName`, `isLoading`)
- **Functions**: camelCase (`getUserData`, `validateInput`)
- **Types/Interfaces**: PascalCase (`Teacher`, `SchoolSettings`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Components**: PascalCase (`TeacherEditDialog`, `TimetableGrid`)
- **Files**: kebab-case for components (`teacher-edit-dialog.tsx`)

### File Organization
- **Component files**: Use `.tsx` extension
- **Utility files**: Use `.ts` extension
- **Test files**: Use `.test.ts` or `.spec.ts` suffix
- **Index files**: Re-export from `index.ts` files
- **Barrel exports**: Use index files to create clean import paths

## React Conventions

### Component Structure
```typescript
// 1. Imports (external libraries first, then internal)
import React from 'react'
import { Button } from '@/components/ui/button'
import { useTeacherApi } from '@/hooks/use-teacher-api'

// 2. Types/Interfaces
interface ComponentProps {
  title: string
  onSubmit: (data: FormData) => void
}

// 3. Component definition
export function ComponentName({ title, onSubmit }: ComponentProps) {
  // 4. Hooks (state, effects, custom hooks)
  const [isLoading, setIsLoading] = useState(false)
  const { teachers, createTeacher } = useTeacherApi()

  // 5. Event handlers
  const handleSubmit = useCallback((data: FormData) => {
    setIsLoading(true)
    onSubmit(data)
  }, [onSubmit])

  // 6. Early returns
  if (isLoading) return <LoadingSpinner />

  // 7. Render
  return (
    <div>
      {/* JSX content */}
    </div>
  )
}
```

### Custom Hooks
- **Prefix with `use`**: `useTeacherApi`, `useTimetableData`
- **Return objects**: Prefer `{ data, error, loading }` over arrays
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Type safety**: Full TypeScript coverage for hook parameters and returns

## API Conventions

### Route Structure
- **Legacy API (v1)**: `/api/frontend/*` - Basic REST endpoints
- **Type-safe API**: `/api/*` - OpenAPI with Zod validation
- **RESTful naming**: Use HTTP verbs and resource names appropriately

### Response Format
```typescript
// Success response
{
  success: true,
  data: T,
  timestamp: string
}

// Error response
{
  success: false,
  error: string,
  details?: string[],
  timestamp: string
}
```

### Validation
- **Zod schemas**: All API inputs validated with Zod
- **Shared schemas**: Types defined in `src/shared/schemas.ts`
- **Runtime validation**: Server-side validation for all requests
- **Type generation**: Types automatically generated from Zod schemas

## Database Conventions

### Drizzle ORM
- **Table definitions**: Located in `src/backend/db/schema.ts`
- **Migrations**: Generated automatically with `npm run db:generate`
- **Type safety**: Full TypeScript integration with Drizzle

### Naming
- **Tables**: snake_case (`school_settings`, `timetable_slots`)
- **Columns**: snake_case (`created_at`, `teacher_id`)
- **Foreign keys**: `{table}_id` format (`teacher_id`, `subject_id`)

## Testing Conventions

### Unit Tests (Vitest)
- **File naming**: `*.test.ts` or `*.spec.ts`
- **Test structure**: Arrange-Act-Assert pattern
- **Mocking**: Use Vitest's built-in mocking capabilities
- **Coverage**: Aim for 80%+ coverage on critical paths

### E2E Tests (Playwright)
- **File naming**: `*.spec.ts` in `tests/e2e/`
- **Page objects**: Create reusable page interaction helpers
- **Test data**: Use isolated test data for reliability
- **Authentication**: Shared authentication state across tests

## Documentation

### Code Comments
- **JSDoc**: Use for public APIs and complex functions
- **Inline comments**: Explain "why" not "what"
- **TODO comments**: Include ticket references where applicable

### README Files
- **Project-level**: Comprehensive setup and usage instructions
- **Feature-level**: Document complex business logic
- **API documentation**: Auto-generated from OpenAPI specs