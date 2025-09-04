# Task Completion Workflow

## When a Task is Completed

After making any code changes, follow this mandatory workflow:

### 1. Code Quality Validation
```bash
npm run lint:fix              # Fix all linting issues automatically
npm run format                # Ensure consistent code formatting
```

### 2. Unit Test Validation
```bash
npm run test:run              # Run all unit tests
npm run test:coverage         # Verify coverage remains high (aim for 80%+)
```

### 3. Type Safety Verification
```bash
npx tsc --noEmit              # Verify TypeScript compilation
npm run cf-typegen            # Update Cloudflare types if needed
```

### 4. Build Verification
```bash
npm run build                 # Verify successful production build
```

### 5. Critical E2E Testing
```bash
npm run test:e2e:crud         # Test core CRUD functionality
npm run test:e2e:auth         # Verify authentication works
```

### 6. Deployment (if all tests pass)
```bash
npm run deploy                # Deploy to production
```

### 7. Post-deployment Validation
```bash
# Test production endpoints
curl https://school-timetable-monorepo.grundhunter.workers.dev/api/frontend/school/settings
```

## Quality Gates

### Unit Testing Requirements
- **Coverage**: Maintain 80%+ code coverage
- **Type Safety**: No TypeScript errors allowed
- **Performance**: Tests should complete within 30 seconds

### E2E Testing Requirements
- **Authentication**: Must pass authentication flow
- **CRUD Operations**: All create/read/update/delete operations work
- **Data Integrity**: No data corruption during tests

### Code Quality Requirements
- **Biome Linting**: Zero linting errors
- **No Explicit Any**: All types properly defined
- **No Unused Variables**: Clean, optimized code

## Error Handling

### If Unit Tests Fail
1. Fix the failing tests first
2. Run `npm run test:coverage` to identify uncovered code
3. Add tests for new functionality
4. Ensure 100% of critical paths are tested

### If E2E Tests Fail
1. Check authentication state (`npm run test:e2e:auth`)
2. Verify database state and clean test data
3. Re-run specific failing tests
4. Check for timing issues or race conditions

### If Build Fails
1. Check TypeScript errors with `npx tsc --noEmit`
2. Verify all dependencies are installed
3. Clear build cache: `rm -rf dist/ && npm run build`
4. Check for missing environment variables

### If Deployment Fails
1. Verify Wrangler authentication: `npx wrangler whoami`
2. Check `wrangler.toml` configuration
3. Verify all secrets are set properly
4. Check Cloudflare Workers limits and quotas

## Continuous Integration Mindset

### Before Every Commit
1. Run `npm run lint:fix`
2. Run `npm run test:run`
3. Verify builds successfully

### Before Every Deployment
1. Full test suite: `npm run test:coverage`
2. E2E validation: `npm run test:e2e:crud`
3. Build verification: `npm run build`

### After Every Deployment
1. Smoke test production endpoints
2. Verify authentication flow works
3. Check monitoring and logs: `npx wrangler tail`

## Documentation Updates

### When Adding New Features
1. Update API documentation if applicable
2. Add/update unit tests
3. Update E2E tests if user-facing changes
4. Update CLAUDE.md with new commands or patterns

### When Fixing Bugs
1. Add regression tests
2. Document the fix in commit messages
3. Update relevant documentation if behavior changes

## Performance Considerations

### Build Performance
- Frontend build should complete in < 2 minutes
- Backend build should complete in < 30 seconds
- Full test suite should complete in < 5 minutes

### Runtime Performance
- API responses should be < 200ms for simple operations
- Database queries should be optimized
- Frontend bundle size should remain < 1MB total

## Emergency Procedures

### If Production is Broken
1. **Immediate**: Check `npx wrangler tail` for errors
2. **Quick fix**: Deploy previous working version
3. **Investigation**: Identify root cause
4. **Resolution**: Fix and test thoroughly before redeploying

### If Database is Corrupted
1. **Backup**: Ensure D1 database backup exists
2. **Recovery**: Use data repair API if available
3. **Validation**: Verify data integrity after recovery
4. **Prevention**: Add more validation to prevent recurrence