# Tech Stack Detailed Reference

## Frontend Dependencies

### Core Framework
- **React 19.1.0** - Latest React with concurrent features and improved performance
- **React DOM 19.1.0** - DOM renderer for React
- **React Router DOM 7.6.3** - Client-side routing with data loading

### UI & Styling
- **Radix UI** - Accessible component primitives:
  - `@radix-ui/react-dialog` - Modal dialogs
  - `@radix-ui/react-select` - Dropdown selects
  - `@radix-ui/react-checkbox` - Form checkboxes
  - `@radix-ui/react-label` - Form labels
  - `@radix-ui/react-tabs` - Tab navigation
  - `@radix-ui/react-toast` - Notification toasts
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Tailwind Merge** - Utility for merging Tailwind classes
- **Class Variance Authority** - Component variant management
- **Lucide React** - Modern icon library
- **clsx** - Conditional className utility

### Interaction & UX
- **@dnd-kit** - Modern drag and drop:
  - `@dnd-kit/core` - Core functionality
  - `@dnd-kit/sortable` - Sortable lists
  - `@dnd-kit/utilities` - Helper utilities
- **Sonner** - Toast notifications

### Authentication
- **@clerk/clerk-react 5.32.4** - Authentication provider

## Backend Dependencies

### Core Framework
- **Hono 4.8.3** - Ultra-fast web framework for Workers
- **@hono/zod-validator** - Zod-based request validation
- **@hono/zod-openapi** - OpenAPI spec generation with Zod
- **@hono/swagger-ui** - Interactive API documentation

### Database & ORM
- **Drizzle ORM 0.44.2** - Type-safe SQL ORM
- **Drizzle Kit 0.31.4** - Migration and studio tools

### Validation & Types
- **Zod 3.25.73** - Runtime type validation and parsing
- **@paralleldrive/cuid2** - Unique ID generation

### Authentication & Security
- **Jose 5.9.6** - JWT handling
- **jsonwebtoken 9.0.2** - JWT token management
- **jwks-client 2.0.5** - JSON Web Key Set client

## Development Tools

### Code Quality
- **Biome 2.0.6** - Fast linter and formatter (ESLint + Prettier replacement)
  - Strict TypeScript rules
  - No explicit `any` types
  - Unused variable detection
  - Modern formatting rules

### Testing
- **Vitest 3.2.4** - Fast unit testing framework
- **@vitest/coverage-v8** - Code coverage reporting
- **Playwright 1.54.1** - E2E testing framework
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - DOM testing utilities
- **jsdom** - DOM environment for testing

### Build Tools
- **Vite 7.0.3** - Fast build tool and dev server
- **@vitejs/plugin-react** - React integration for Vite
- **TypeScript 5.8.3** - Type checking and compilation
- **@cloudflare/vite-plugin** - Cloudflare Workers integration

### Deployment
- **Wrangler 4.17.0** - Cloudflare Workers CLI
- **@cloudflare/workers-types** - TypeScript definitions

### Documentation
- **TypeDoc 0.28.10** - API documentation generation
- **markdown-it** - Markdown processing
- **mermaid** - Diagram generation

## Configuration Files

### Code Quality
- `biome.json` - Biome linter and formatter configuration
- `tsconfig.json` - TypeScript project references
- `tsconfig.app.json` - Main application TypeScript config
- `tsconfig.node.json` - Node.js specific TypeScript config

### Build & Development
- `vite.frontend.config.ts` - Frontend Vite configuration
- `vite.backend.config.ts` - Backend Vite configuration
- `vitest.config.ts` - Unit testing configuration
- `playwright.config.ts` - E2E testing configuration

### Deployment
- `wrangler.toml` - Cloudflare Workers configuration
- `package.json` - NPM scripts and dependencies

### Styling
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration