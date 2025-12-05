# Research: Testing Infrastructure for Nuxt 4.2.1

**Feature**: 003-testing-infrastructure
**Date**: 2025-12-04
**Research Focus**: Vitest unit testing + Playwright E2E testing integration for Nuxt 4.2.1 application

## Executive Summary

This research evaluates the optimal testing strategy for the Nuxt 4.2.1 + TypeScript 5.9 SaaS starter application. The recommended approach uses Vitest for fast unit/component tests and Playwright for comprehensive E2E testing, with full CI/CD integration.

## Technology Decisions

### Decision 1: Unit Testing Framework - Vitest

**Decision**: Use Vitest as the primary unit testing framework with `@nuxt/test-utils` for Nuxt-specific integration.

**Rationale**:
- **Native Vite integration**: Nuxt 4 uses Vite, Vitest is built for Vite (zero config conflicts)
- **Performance**: 10x faster than Jest for typical Vue/Nuxt tests (sub-second startup)
- **First-class TypeScript support**: No `ts-jest` needed, uses Vite's existing TS transform
- **Nuxt ecosystem compatibility**: Official `@nuxt/test-utils` provides Nuxt runtime, auto-imports, composables testing
- **Active maintenance**: Vitest is actively developed by Vue ecosystem team (Vite core team)
- **Coverage tooling**: Built-in `@vitest/coverage-v8` with configurable thresholds

**Alternatives Considered**:
- **Jest**: Popular but slower startup (~5-10s), requires complex Vite/ESM configuration, no native Vite support
- **Mocha**: Less opinionated but lacks built-in mocking, coverage, watch mode - requires manual setup
- **uvu**: Ultra-fast but too minimal, no Nuxt integration, missing ecosystem tooling

**Implementation Details**:
- Use **two Vitest projects**: `unit` (Node environment, pure logic) + `nuxt` (Nuxt runtime, components/composables)
- Install: `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@nuxt/test-utils`, `@testing-library/vue`
- Configuration: `vitest.config.ts` with dual projects, coverage thresholds (70% line coverage target)

### Decision 2: E2E Testing Framework - Playwright

**Decision**: Use Playwright for all end-to-end browser testing with multi-browser support.

**Rationale**:
- **Multi-browser support**: Chromium, Firefox, WebKit (Safari engine) - single API
- **Modern web features**: Full support for Nuxt SSR/hydration, web components, shadow DOM
- **Developer experience**: Built-in wait mechanisms, auto-retry, screenshot/video on failure, trace viewer for debugging
- **Performance**: Headless by default, parallelization support, fast execution
- **Stable API**: Mature project (Microsoft-backed), stable selectors, less flaky tests
- **CI/CD friendly**: Docker images available, GitHub Actions integration, artifact support

**Alternatives Considered**:
- **Cypress**: Popular but limited to Chrome-family browsers, slower parallel execution, requires app recompilation
- **Selenium**: Legacy API, verbose syntax, requires external driver management, slower
- **TestCafe**: JavaScript-only (no multi-browser native support), slower than Playwright

**Implementation Details**:
- Configuration: `playwright.config.ts` with Chromium (primary), Firefox (cross-browser), Mobile (optional)
- Projects: Setup project for authentication + test projects per browser
- Features enabled: Auto-screenshots on failure, video recording, trace files, HTML reports
- Integration: `webServer` config to auto-start Nuxt dev server for tests

### Decision 3: Test Organization Structure

**Decision**: Organize tests by type with separate directories and naming conventions.

**Structure**:
```
test/
├── setup.ts                      # Global Vitest setup (mocks, globals)
├── unit/                         # Pure logic tests (Node env)
│   └── composables/
│       └── useRole.test.ts       # Composable business logic
├── nuxt/                         # Nuxt runtime tests
│   ├── components/
│   │   └── UserFilters.spec.ts  # Component integration
│   └── server/
│       └── api/users.test.ts    # API endpoint tests
└── e2e/                          # End-to-end tests
    ├── global-setup.ts           # Playwright authentication setup
    ├── fixtures.ts               # Custom test fixtures
    └── user-management.e2e.ts   # User journey tests
```

**Rationale**:
- **Clear separation**: Unit tests run fast (Node), E2E tests run slow (browser)
- **Naming convention**: `*.test.ts` (unit), `*.spec.ts` (component), `*.e2e.ts` (E2E)
- **Discoverability**: Easy to find and run specific test types
- **CI optimization**: Can run unit tests in parallel with E2E setup

### Decision 4: Coverage Strategy

**Decision**: Target 70% line coverage with focused exceptions for infrastructure code.

**Coverage Targets**:
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 65% (harder to reach, more permissive)
- **Statements**: 70%

**Rationale**:
- **Pragmatic targets**: 70% is achievable without test bloat, focuses on critical paths
- **Business logic priority**: Composables, services, and API endpoints must have high coverage
- **Exclude boilerplate**: Config files, `.nuxt/` generated code, Nuxt plugins (framework-tested)
- **Avoid vanity metrics**: Don't test trivial getters/setters just for 100%

**Exclusions** (in `vitest.config.ts`):
```typescript
exclude: [
  'node_modules/',
  '.nuxt/',
  'dist/',
  '**/*.config.ts',        // Vite/Nuxt config
  '**/*.{test,spec,e2e}.ts', // Test files themselves
  'test/',                 // Test utilities
  'app/app.vue',          // Root component (mostly framework code)
]
```

### Decision 5: Mocking Strategy

**Decision**: Use minimal mocking with preference for real implementations in Nuxt environment.

**Approach**:
- **Unit tests (Node env)**: Mock external dependencies (auth, database, APIs)
- **Nuxt tests**: Use real Nuxt runtime, mock only external services (Stripe, Better Auth API calls)
- **E2E tests**: Mock external payment providers only, use real database (test DB or in-memory)

**Tools**:
- **Vitest mocks**: `vi.fn()`, `vi.mock()` for module mocks
- **@nuxt/test-utils**: `mockNuxtImport()`, `registerEndpoint()` for Nuxt-aware mocking
- **MSW** (optional): Mock Service Worker for HTTP mocking if needed

**Rationale**:
- **Real behavior testing**: Mocking too much defeats purpose of integration tests
- **Easier maintenance**: Less mocking = less brittle tests when implementation changes
- **Nuxt auto-imports**: `@nuxt/test-utils` handles Nuxt context properly

### Decision 6: CI/CD Integration

**Decision**: Run all test types in GitHub Actions with matrix strategy for Node versions.

**Workflow** (`.github/workflows/test.yml`):
```yaml
jobs:
  unit-tests:
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - Run: npm run test:unit
      - Upload coverage to Codecov (20.x only)

  e2e-tests:
    steps:
      - Install Playwright browsers
      - Run: npm run test:e2e
      - Upload Playwright report artifacts
```

**Rationale**:
- **Fast feedback**: Unit tests run in ~10s, E2E in ~5 minutes
- **Parallel execution**: Unit and E2E tests run concurrently
- **Node version coverage**: Ensure compatibility with LTS versions (18, 20)
- **Artifact storage**: Debug failures with screenshots/videos/traces

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Unit Testing | Vitest | ^2.1.x | Fast unit/component tests |
| Nuxt Integration | @nuxt/test-utils | ^4.0.x | Nuxt runtime in tests |
| Component Testing | @testing-library/vue | ^8.1.x | User-centric component queries |
| E2E Testing | @playwright/test | ^1.49.x | Browser automation |
| Coverage | @vitest/coverage-v8 | ^2.1.x | Code coverage reporting |
| Assertions | Vitest (built-in) | - | expect(), toBe(), etc. |
| Mocking | Vitest (built-in) | - | vi.fn(), vi.mock() |

## Performance Benchmarks

**Expected Test Execution Times** (for initial suite):
- **Unit tests**: < 10 seconds (50 tests)
- **Nuxt component tests**: < 20 seconds (20 component tests)
- **E2E tests**: < 5 minutes (20 scenarios, Chromium only)
- **Total CI time**: < 6 minutes (parallel execution)

**Optimization Strategies**:
- Use `pool: 'threads'` for parallel unit tests
- Enable `fullyParallel: true` in Playwright
- Reuse dev server in E2E (`reuseExistingServer: true`)
- Cache `node_modules` and Playwright browsers in CI

## Best Practices

### Unit Testing
1. **Test composables independently**: Focus on business logic, not Nuxt runtime
2. **Mock external dependencies**: APIs, auth, database
3. **Use descriptive test names**: "returns true when user has admin role"
4. **Test edge cases**: null, undefined, empty arrays, error conditions

### Component Testing
1. **Use Nuxt environment**: Test with real auto-imports and Nuxt context
2. **Query by accessibility**: Prefer `getByRole()`, `getByLabelText()` over `getByTestId()`
3. **Test user interactions**: Click, type, submit - not internal state
4. **Verify rendered output**: Check text, attributes, visibility - not implementation

### E2E Testing
1. **Test critical user journeys**: Login → Dashboard → Action workflows
2. **Use Page Object pattern**: Encapsulate page interactions in classes
3. **Parallelize with caution**: Ensure tests are independent (no shared state)
4. **Capture debugging artifacts**: Screenshots, videos, traces on failure
5. **Avoid hardcoded waits**: Use `waitForURL()`, `waitForSelector()` instead of `setTimeout`

### CI/CD Integration
1. **Run unit tests first**: Fast feedback before slow E2E tests
2. **Upload artifacts**: Coverage reports, test results, Playwright artifacts
3. **Fail PR on test failures**: Block merge if tests fail or coverage drops
4. **Cache dependencies**: Node modules, Playwright browsers

## Migration Path

### Phase 1: Setup Infrastructure
1. Install dependencies (`vitest`, `@playwright/test`, etc.)
2. Create `vitest.config.ts` and `playwright.config.ts`
3. Setup test directories (`test/unit`, `test/nuxt`, `test/e2e`)
4. Add npm scripts (`test:unit`, `test:e2e`, etc.)

### Phase 2: Initial Test Coverage
1. Write unit tests for existing composables (`useRole`, `useUsers`, etc.)
2. Write component tests for critical components (`UserList`, `UserFilters`)
3. Write E2E tests for authentication flow (login, logout)
4. Setup coverage reporting

### Phase 3: CI/CD Integration
1. Create GitHub Actions workflow (`.github/workflows/test.yml`)
2. Configure Codecov for coverage reports
3. Add PR checks (tests must pass)
4. Setup artifact storage

### Phase 4: Expand Coverage
1. Add tests for admin user management feature
2. Test error scenarios and edge cases
3. Add E2E tests for critical user flows
4. Refine coverage thresholds based on actual coverage

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky E2E tests | CI failures, developer frustration | Use Playwright auto-retry, avoid hardcoded waits, enable trace recording |
| Slow test execution | Delayed feedback | Parallelize tests, use headless mode, optimize fixtures |
| Low test coverage | Bugs in production | Set coverage thresholds, require tests for new features |
| Test maintenance burden | Outdated tests | Focus on user-facing behavior, avoid implementation testing |
| CI cost (Playwright browsers) | Budget impact | Use Docker images, cache browsers, run E2E selectively |

## Open Questions

None - all technical decisions finalized based on research.

## References

- **Nuxt Testing Guide**: https://nuxt.com/docs/4.x/getting-started/testing
- **Vitest Documentation**: https://vitest.dev/
- **Playwright Documentation**: https://playwright.dev/docs/intro
- **@nuxt/test-utils**: https://github.com/nuxt/test-utils
- **Testing Library**: https://testing-library.com/docs/vue-testing-library/intro/
- **Coverage Best Practices**: https://vitest.dev/guide/coverage.html

## Conclusion

The combination of Vitest (unit) + Playwright (E2E) provides a robust, performant, and maintainable testing solution for the Nuxt 4.2.1 application. This approach aligns with modern web development practices, provides excellent developer experience, and integrates seamlessly with existing CI/CD workflows.
