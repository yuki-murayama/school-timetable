# Essential Development Commands

## 🚀 Development & Running

### Start Development Environment
```bash
npm run dev                    # Start both frontend and backend
npm run dev:frontend           # Frontend only (port 5173)
npm run dev:backend           # Backend only (port 8787)
```

### Building & Deployment
```bash
npm run build                 # Build both frontend and backend
npm run build:frontend        # Build frontend only
npm run build:backend         # Build backend only
npm run deploy                # Deploy to Cloudflare Workers
```

## 🧪 Testing Commands

### Unit Testing (Vitest)
```bash
npm test                      # Run tests in watch mode
npm run test:run              # Run tests once
npm run test:coverage         # Run with coverage report
npm run test:coverage:watch   # Coverage in watch mode
npm run test:coverage:ui      # Coverage with web UI
npm run test:unit             # Unit tests only
npm run test:unit:coverage    # Unit tests with coverage
```

### E2E Testing (Playwright)
```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:chrome       # Chrome only
npm run test:e2e:ui           # With Playwright UI
npm run test:e2e:headed       # With browser UI visible
npm run test:e2e:auth         # Authentication setup only
npm run test:e2e:crud         # CRUD operations test
npm run test:e2e:school       # School settings test
npm run test:e2e:teachers     # Teacher management test
npm run test:e2e:report       # Show test report
npm run test:e2e:cross-browser # Multi-browser testing
```

## 🔧 Code Quality

### Linting & Formatting (Biome)
```bash
npm run lint                  # Check code quality
npm run lint:fix              # Fix linting issues
npm run format                # Format code
```

### Type Checking
```bash
npx tsc --noEmit              # Type check without compilation
npm run cf-typegen            # Generate Cloudflare types
```

## 🗄️ Database Operations

### Drizzle Database Management
```bash
npm run db:generate           # Generate migrations
npm run db:push               # Apply migrations to database
npm run db:studio             # Open Drizzle Studio (GUI)
npm run db:migrate            # Run migrations
```

### Database Initialization
```bash
# Initialize database via API (use deployed URL)
curl -X POST https://school-timetable-monorepo.grundhunter.workers.dev/api/init-db
```

## 📊 Documentation & Analysis

### Documentation Generation
```bash
npm run docs:generate         # Generate TypeDoc API docs
npm run docs:design           # Generate design documentation
```

### Deployment Monitoring
```bash
npx wrangler tail --format pretty     # Monitor deployment logs
npx wrangler dev --config ./wrangler.toml  # Local development
```

## ⚙️ Cloudflare Workers Commands

### Wrangler CLI
```bash
wrangler whoami               # Check authentication
wrangler d1 list              # List D1 databases
wrangler d1 info DB --local   # Database info (local)
wrangler d1 execute DB --local --command "SELECT * FROM teachers LIMIT 5"
```

## 🔍 Debugging & Development

### Development Server URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8787
- **Production**: https://school-timetable-monorepo.grundhunter.workers.dev

### Common Debug Tasks
```bash
# Check build output
ls -la dist/

# Validate package.json scripts
npm run-script

# Check dependency issues
npm audit
npm audit fix

# Clear caches
rm -rf node_modules package-lock.json
npm install
```

## 🚨 Emergency Commands

### Quick Problem Resolution
```bash
# Full clean reinstall
rm -rf node_modules package-lock.json dist/
npm install
npm run build

# Reset E2E test environment
rm -rf tests/e2e/.auth/
npm run test:e2e:auth

# Check deployment status
npx wrangler deployments list

# Rollback deployment (if needed)
npx wrangler rollback [deployment-id]
```

### System Requirements Check
```bash
node --version                # Should be 18+
npm --version                 # Should be recent
npx wrangler --version        # Should be 4.17.0+
```

## 📋 Task Completion Checklist

After making code changes, run in this order:
1. `npm run lint:fix` - Fix code quality issues
2. `npm run test:run` - Ensure unit tests pass
3. `npm run build` - Verify successful build
4. `npm run test:e2e:crud` - Run critical E2E tests
5. `npm run deploy` - Deploy if all tests pass

## 🎯 Performance Optimization
```bash
# Analyze bundle size
npm run build:frontend && ls -lah dist/frontend/assets/

# Check test performance
npm run test:coverage -- --reporter=verbose

# Monitor E2E test timing
npm run test:e2e -- --reporter=line
```