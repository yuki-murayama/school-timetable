# Development Guidelines and Best Practices

## Project Architecture Principles

### Monorepo Structure
- **Single deployment**: Everything runs on Cloudflare Workers
- **Shared types**: Common types in `src/shared/` for consistency
- **API versioning**: Legacy v1 (`/api/frontend/*`) and unified API (`/api/*`)
- **Type safety**: End-to-end TypeScript with runtime validation

### Design Patterns

#### Type Safety Strategy
- **Shared schemas**: All data types defined in `src/shared/schemas.ts`
- **Zod validation**: Runtime type checking at API boundaries
- **Zero-tolerance**: No `any` types allowed (Biome enforces this)
- **Code generation**: Types automatically generated from Zod schemas

#### API Design
- **RESTful conventions**: Standard HTTP verbs and resource naming
- **Consistent responses**: Standardized success/error response format
- **OpenAPI integration**: Auto-generated documentation with `@hono/zod-openapi`
- **Version compatibility**: Maintain backward compatibility for legacy endpoints

#### Component Architecture
- **Radix UI foundation**: Build on accessible primitives
- **Composition pattern**: Combine small, focused components
- **Custom hooks**: Extract business logic into reusable hooks
- **Type-safe props**: All component props fully typed

## Development Workflow

### Feature Development Process
1. **Plan**: Define types in `src/shared/schemas.ts` first
2. **Backend**: Implement API endpoints with Zod validation
3. **Frontend**: Create UI components and integrate with APIs
4. **Testing**: Write unit tests and add E2E test coverage
5. **Documentation**: Update API docs and component documentation

### Code Organization Best Practices
- **Single responsibility**: Each file/function has one clear purpose
- **Barrel exports**: Use index files for clean imports
- **Consistent naming**: Follow established conventions across the codebase
- **Error boundaries**: Implement proper error handling at all levels

## Testing Strategy

### Unit Testing Philosophy
- **Test behavior, not implementation**: Focus on what the code does
- **High coverage**: Aim for 80%+ coverage on critical paths
- **Fast execution**: Tests should run quickly for developer productivity
- **Isolated tests**: Each test should be independent and repeatable

### E2E Testing Approach
- **User-centric**: Test from the user's perspective
- **Critical paths**: Focus on core business functionality
- **Data isolation**: Use test-specific data to avoid conflicts
- **Cross-browser**: Validate on multiple browsers for compatibility

### Test Data Management
- **Clean slate**: Each test should start with a known state
- **Realistic data**: Use data that resembles production scenarios
- **Edge cases**: Test boundary conditions and error scenarios
- **Performance**: Monitor test execution time and optimize slow tests

## Security Guidelines

### Authentication & Authorization
- **Clerk integration**: Leverage Clerk for secure authentication
- **JWT validation**: Verify tokens on all protected endpoints
- **Principle of least privilege**: Grant minimal necessary permissions
- **Session management**: Proper session handling and cleanup

### Data Protection
- **Input validation**: Validate all user inputs with Zod schemas
- **SQL injection prevention**: Use parameterized queries with Drizzle ORM
- **XSS protection**: Sanitize all user-generated content
- **CORS configuration**: Properly configure cross-origin requests

### Deployment Security
- **Environment variables**: Store secrets securely in Wrangler configuration
- **HTTPS only**: All production traffic must use HTTPS
- **Content Security Policy**: Implement appropriate CSP headers
- **Monitoring**: Log security-relevant events for analysis

## Performance Optimization

### Frontend Performance
- **Bundle optimization**: Use Vite's code splitting and tree shaking
- **Lazy loading**: Load components and routes on demand
- **Image optimization**: Optimize and compress all images
- **Caching strategy**: Implement appropriate browser caching

### Backend Performance
- **Database optimization**: Use indexes and efficient queries
- **Response caching**: Cache static and semi-static responses
- **Async operations**: Use async/await for non-blocking operations
- **Bundle size**: Keep Worker bundle under size limits

### Development Performance
- **Fast feedback**: Optimize build and test times
- **Hot reloading**: Use Vite's fast refresh for development
- **Parallel processing**: Run independent tasks concurrently
- **Incremental builds**: Only rebuild what has changed

## Error Handling Philosophy

### Frontend Error Handling
- **User-friendly messages**: Display helpful error messages to users
- **Graceful degradation**: Application should remain functional during errors
- **Error boundaries**: Catch and handle React component errors
- **Loading states**: Provide feedback during async operations

### Backend Error Handling
- **Structured errors**: Use consistent error response format
- **Appropriate status codes**: Return correct HTTP status codes
- **Error logging**: Log errors for debugging and monitoring
- **Input validation**: Validate inputs and return clear validation errors

### Monitoring and Debugging
- **Structured logging**: Use consistent log formats for analysis
- **Error tracking**: Monitor production errors and performance
- **Debug information**: Include relevant context in error messages
- **Performance metrics**: Track key performance indicators

## Accessibility Standards

### WCAG Compliance
- **Keyboard navigation**: All interactive elements accessible via keyboard
- **Screen reader support**: Proper ARIA labels and semantic HTML
- **Color contrast**: Meet WCAG AA color contrast requirements
- **Focus management**: Clear focus indicators and logical tab order

### Inclusive Design
- **Responsive design**: Support various screen sizes and devices
- **Progressive enhancement**: Core functionality works without JavaScript
- **Internationalization**: Design for multiple languages and cultures
- **User preferences**: Respect system preferences for motion and themes

## Maintenance and Evolution

### Code Maintenance
- **Regular updates**: Keep dependencies up to date
- **Refactoring**: Continuously improve code quality and structure
- **Documentation**: Maintain accurate and helpful documentation
- **Performance monitoring**: Track and optimize performance over time

### Feature Evolution
- **Backward compatibility**: Maintain compatibility when possible
- **Migration strategies**: Plan and execute smooth migrations
- **Feature flags**: Use feature flags for gradual rollouts
- **User feedback**: Incorporate user feedback into development planning