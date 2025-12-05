# Implementation Plan: Testing Infrastructure

**Branch**: `003-testing-infrastructure` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-testing-infrastructure/spec.md`

## Summary

Implement comprehensive testing infrastructure for the Nuxt 4.2.1 SaaS starter using Vitest for unit/component tests and Playwright for E2E tests. This establishes automated testing capabilities with code coverage reporting, CI/CD integration, and debugging tools to ensure code quality and prevent regressions.

**Primary Requirement**: Enable developers to run fast unit tests (< 10s), comprehensive E2E tests (< 5min), and generate coverage reports, with full CI/CD integration blocking merges on test failures.

**Technical Approach**:
- **Vitest** with dual projects (Node for unit tests, Nuxt runtime for component tests)
- **Playwright** for multi-browser E2E testing with auto-retry and debugging artifacts
- **@nuxt/test-utils** for Nuxt-specific testing features (auto-imports, composables)
- **Coverage targets**: 70% lines/functions, 65% branches

## Technical Context

**Language/Version**: TypeScript 5.9+, Node.js 18/20
**Primary Dependencies**:
- `vitest ^2.1.x` - Unit test framework
- `@playwright/test ^1.49.x` - E2E test framework
- `@nuxt/test-utils ^4.0.x` - Nuxt testing utilities
- `@vitest/coverage-v8 ^2.1.x` - Coverage reporting
- `@testing-library/vue ^8.1.x` - Component testing utilities

**Storage**: N/A (ephemeral test artifacts only)
**Testing**: Self-referential (testing infrastructure tests itself)
**Target Platform**: Local development (macOS/Linux/Windows) + CI (Ubuntu)
**Project Type**: Web application (Nuxt 4 full-stack)
**Performance Goals**:
- Unit tests: < 10s for 50 tests
- E2E tests: < 5 minutes for 20 scenarios
- Coverage generation: < 5s
**Constraints**:
- Must integrate with existing Nuxt 4.2.1 + TypeScript 5.9 setup
- Must support auto-imports without manual configuration
- Must work in CI/CD (GitHub Actions)
- Must capture debugging artifacts on failure
**Scale/Scope**:
- Initial: ~10 unit tests, ~5 E2E tests
- Target: ~100 unit tests, ~50 E2E tests (full application coverage)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Constitution Status**: No project-specific constitution exists (`.specify/memory/constitution.md` is template).

**General Best Practices Applied**:
- ✅ **Test-Driven Development**: Infrastructure enables TDD workflow
- ✅ **Fast Feedback**: Unit tests run in seconds
- ✅ **Automation**: CI/CD integration blocks bad code
- ✅ **Observability**: Coverage reports + E2E artifacts for debugging
- ✅ **Simplicity**: Minimal mocking, prefer real implementations

**No Constitution Violations**: This is testing infrastructure (meta-feature), not subject to typical feature gates.

## Project Structure

### Documentation (this feature)

```text
specs/003-testing-infrastructure/
├── spec.md                  # Feature specification
├── plan.md                  # This file (/speckit.plan output)
├── research.md              # Phase 0 output (Vitest/Playwright research)
├── data-model.md            # Phase 1 output (no persistent data)
├── quickstart.md            # Phase 1 output (5-minute setup guide)
├── contracts/               # Phase 1 output
│   └── test-contracts.md    # Test file contracts & patterns
└── tasks.md                 # Phase 2 output (/speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```text
/Volumes/ExternalMac/Dev/starter-nuxt/
├── vitest.config.ts                    # Vitest configuration
├── playwright.config.ts                # Playwright configuration
├── test/                               # All test files
│   ├── setup.ts                        # Global Vitest setup
│   ├── unit/                           # Unit tests (Node environment)
│   │   ├── composables/
│   │   │   ├── useRole.test.ts
│   │   │   └── useUsers.test.ts
│   │   └── utils/
│   │       └── validation.test.ts
│   ├── nuxt/                           # Nuxt runtime tests
│   │   ├── components/
│   │   │   ├── UserList.spec.ts
│   │   │   └── UserFilters.spec.ts
│   │   └── server/
│   │       └── api/
│   │           └── users.test.ts
│   └── e2e/                            # End-to-end tests
│       ├── global-setup.ts             # Playwright setup (auth)
│       ├── global-teardown.ts          # Playwright cleanup
│       ├── fixtures.ts                 # Custom test fixtures
│       ├── auth.e2e.ts                 # Authentication flows
│       └── user-management.e2e.ts      # Admin user management
├── coverage/                           # Generated coverage reports (gitignored)
│   ├── index.html                      # HTML report
│   └── coverage-final.json             # Raw coverage data
├── test-results/                       # Playwright results (gitignored)
│   └── artifacts/                      # Screenshots, videos, traces
├── playwright-report/                  # HTML report (gitignored)
└── .github/
    └── workflows/
        └── test.yml                    # CI/CD workflow
```

**Structure Decision**: Organize tests by type in `test/` directory:
- `unit/` - Pure logic tests (fast, no DOM, no Nuxt runtime)
- `nuxt/` - Component/composable tests (Nuxt runtime required)
- `e2e/` - Browser-based user journey tests

This separation enables:
- Fast unit test execution without Nuxt overhead
- Parallel test execution by type
- Clear test organization and discoverability
- Optimized CI/CD pipelines (run unit tests first)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. Testing infrastructure is a foundational feature without complexity concerns.

## Phase 0: Research (Complete)

**Status**: ✅ Complete
**Output**: [research.md](./research.md)

**Findings**:
1. **Unit Testing**: Vitest chosen over Jest (10x faster, native Vite support)
2. **E2E Testing**: Playwright chosen over Cypress (multi-browser, better tooling)
3. **Coverage**: 70% line coverage target (pragmatic, achievable)
4. **CI/CD**: GitHub Actions with matrix strategy (Node 18/20)

**Key Decisions**:
- Use `@nuxt/test-utils` for Nuxt-specific features
- Dual Vitest projects: `unit` (Node) + `nuxt` (full runtime)
- Playwright projects: Chromium (primary) + Firefox (cross-browser)
- Mock only external services (auth, payments), prefer real implementations

## Phase 1: Design & Contracts (Complete)

**Status**: ✅ Complete
**Outputs**:
- [data-model.md](./data-model.md) - No persistent data (ephemeral artifacts only)
- [contracts/test-contracts.md](./contracts/test-contracts.md) - Test file patterns & contracts
- [quickstart.md](./quickstart.md) - 5-minute setup guide

**Design Highlights**:
- **No persistent data**: Test artifacts are ephemeral (screenshots, traces, coverage)
- **Test organization**: `unit/`, `nuxt/`, `e2e/` directories
- **Naming conventions**: `*.test.ts` (unit), `*.spec.ts` (component), `*.e2e.ts` (E2E)
- **CI/CD integration**: Parallel unit + E2E execution, artifact upload

## Implementation Roadmap

### Phase 2: Setup & Configuration (Priority P1)

**Goal**: Install dependencies and create configuration files

**Tasks**:
1. Install Vitest dependencies
   - `vitest`, `@vitest/ui`, `@vitest/coverage-v8`
   - `@nuxt/test-utils`, `@vitejs/plugin-vue`
   - `@testing-library/vue`, `@testing-library/jest-dom`

2. Install Playwright dependencies
   - `@playwright/test`
   - Run `npx playwright install chromium`

3. Create `vitest.config.ts`
   - Configure dual projects (`unit`, `nuxt`)
   - Setup coverage thresholds (70/70/65/70)
   - Add global setup file

4. Create `playwright.config.ts`
   - Configure Chromium project
   - Setup webServer (auto-start Nuxt dev)
   - Enable screenshots/traces on failure

5. Create `test/setup.ts` (global Vitest setup)
   - Mock IntersectionObserver
   - Mock window.matchMedia
   - Setup @testing-library/jest-dom

6. Add NPM scripts
   - `test`, `test:unit`, `test:nuxt`, `test:coverage`
   - `test:e2e`, `test:e2e:ui`, `test:e2e:debug`
   - `test:all`

**Acceptance Criteria**:
- ✅ All dependencies installed
- ✅ Config files created and valid
- ✅ `npm run test:unit` runs (even with 0 tests)
- ✅ `npm run test:e2e` starts dev server and runs

**Time Estimate**: 1 hour

### Phase 3: Initial Test Suite (Priority P1)

**Goal**: Write initial tests for existing features

**Tasks**:
1. Write unit tests for composables
   - `test/unit/composables/useRole.test.ts`
   - `test/unit/composables/useUsers.test.ts`
   - `test/unit/composables/useContentI18n.test.ts`

2. Write component tests
   - `test/nuxt/components/UserList.spec.ts`
   - `test/nuxt/components/UserFilters.spec.ts`
   - `test/nuxt/components/EditUserModal.spec.ts`

3. Write E2E tests for authentication
   - `test/e2e/global-setup.ts` (login automation)
   - `test/e2e/auth.e2e.ts` (login, logout, signup)

4. Write E2E tests for user management
   - `test/e2e/user-management.e2e.ts` (view, filter, edit, delete)

**Acceptance Criteria**:
- ✅ At least 10 unit tests passing
- ✅ At least 5 component tests passing
- ✅ At least 5 E2E tests passing
- ✅ Coverage > 50% (initial target)

**Time Estimate**: 4 hours

### Phase 4: CI/CD Integration (Priority P2)

**Goal**: Automate testing in GitHub Actions

**Tasks**:
1. Create `.github/workflows/test.yml`
   - Job: `unit-tests` (matrix: Node 18/20)
   - Job: `e2e-tests` (Chromium only in CI)
   - Job: `typecheck` (TypeScript validation)
   - Job: `lint` (ESLint validation)

2. Configure coverage upload
   - Install Codecov GitHub Action
   - Upload coverage from unit-tests job

3. Configure artifact storage
   - Upload Playwright report on E2E failure
   - Upload test-results/ directory

4. Add branch protection rules
   - Require all jobs to pass before merge
   - Require coverage not to drop

**Acceptance Criteria**:
- ✅ GitHub Actions workflow runs on PR
- ✅ All tests execute in CI
- ✅ Coverage uploaded to Codecov
- ✅ Playwright artifacts available on failure

**Time Estimate**: 2 hours

### Phase 5: Expand Coverage (Priority P3)

**Goal**: Increase test coverage to 70% target

**Tasks**:
1. Add tests for untested composables
   - `useAuth`, `useSubscription`, etc.

2. Add tests for API endpoints
   - `test/nuxt/server/api/admin/users.test.ts`
   - `test/nuxt/server/api/subscriptions.test.ts`

3. Add tests for edge cases
   - Error handling
   - Loading states
   - Empty states
   - Permission checks

4. Add E2E tests for remaining critical flows
   - Subscription management
   - Profile updates
   - Admin config

**Acceptance Criteria**:
- ✅ Coverage >= 70% lines
- ✅ Coverage >= 70% functions
- ✅ Coverage >= 65% branches
- ✅ All critical paths have E2E tests

**Time Estimate**: 6 hours

### Phase 6: Polish & Documentation (Priority P3)

**Goal**: Refine tests and document patterns

**Tasks**:
1. Review test quality
   - Descriptive test names
   - AAA pattern (Arrange, Act, Assert)
   - No hardcoded waits in E2E tests

2. Add test utilities
   - Factory functions for mock data
   - Custom matchers (optional)
   - Shared fixtures

3. Update documentation
   - Add testing guide to `README.md`
   - Document testing patterns
   - Add troubleshooting guide

4. Optimize test performance
   - Enable parallel execution
   - Cache dependencies in CI
   - Optimize Playwright browser downloads

**Acceptance Criteria**:
- ✅ All tests follow consistent patterns
- ✅ Documentation complete
- ✅ Test execution time < targets (10s unit, 5min E2E)

**Time Estimate**: 2 hours

## Total Estimated Time

**Development**: ~15 hours
- Setup & Configuration: 1 hour
- Initial Test Suite: 4 hours
- CI/CD Integration: 2 hours
- Expand Coverage: 6 hours
- Polish & Documentation: 2 hours

## Dependencies

**External Dependencies**:
- Vitest ecosystem (stable, actively maintained)
- Playwright (Microsoft-backed, stable)
- @nuxt/test-utils (official Nuxt module)

**Internal Dependencies**:
- Existing Nuxt 4.2.1 application
- Existing composables and components to test
- Local Supabase for E2E tests (already setup)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky E2E tests | CI failures, frustration | Use Playwright auto-retry, avoid hardcoded waits |
| Slow test execution | Delayed feedback | Parallelize tests, use headless mode |
| Low developer adoption | Tests not written | Document patterns, require tests for new features |
| CI cost (Playwright) | Budget impact | Cache browsers, run E2E selectively on main branch |

## Success Metrics

- ✅ Unit tests run in < 10 seconds
- ✅ E2E tests run in < 5 minutes
- ✅ Coverage >= 70% lines, 65% branches
- ✅ 100% of critical flows have E2E tests
- ✅ Tests block merge on failure (CI integration)
- ✅ < 2% flaky tests (98% stability)

## Next Steps

1. **Review & Approve Plan**: Stakeholder approval before implementation
2. **Run `/speckit.tasks`**: Generate detailed task breakdown
3. **Implement Phase 2**: Setup configuration and dependencies
4. **Iterate**: Implement remaining phases incrementally

## References

- **Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Quickstart**: [quickstart.md](./quickstart.md)
- **Contracts**: [contracts/test-contracts.md](./contracts/test-contracts.md)
- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/
- **@nuxt/test-utils**: https://github.com/nuxt/test-utils
