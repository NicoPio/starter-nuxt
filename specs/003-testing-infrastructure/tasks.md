# Implementation Tasks: Testing Infrastructure

**Feature**: 003-testing-infrastructure
**Branch**: `003-testing-infrastructure`
**Date**: 2025-12-04

## Overview

This document breaks down the implementation of the Testing Infrastructure feature into executable tasks organized by user story. Each user story is independently testable and delivers incremental value.

**Total Tasks**: 28 tasks across 6 phases
**Parallel Opportunities**: 12 parallelizable tasks marked with [P]
**Test Strategy**: Manual testing + automated test execution validation

---

## Phase 1: Setup & Dependencies (4 tasks)

**Goal**: Install testing libraries and create base configuration

**Prerequisites**: Existing Nuxt 4.2.1 project

### Tasks

- [X] T001 [P] Install Vitest core dependencies (vitest, @vitest/ui, @vitest/coverage-v8)
- [X] T002 [P] Install Nuxt testing utilities (@nuxt/test-utils, @vitejs/plugin-vue, @testing-library/vue, @testing-library/jest-dom)
- [X] T003 Install Playwright (@playwright/test) and run npx playwright install chromium
- [X] T004 [P] Add test NPM scripts to package.json (test, test:unit, test:nuxt, test:coverage, test:e2e, test:e2e:ui, test:all)

**Completion Criteria**: All dependencies installed, NPM scripts defined

---

## Phase 2: Configuration Files (4 tasks)

**Goal**: Create test framework configurations

**Dependencies**: Phase 1 must be complete

### Tasks

- [X] T005 Create vitest.config.ts with dual projects (unit + nuxt), coverage thresholds (70/70/65/70), and setup files
- [X] T006 Create playwright.config.ts with Chromium project, webServer config, screenshot/trace settings
- [X] T007 Create test/setup.ts with global mocks (IntersectionObserver, matchMedia, crypto) and @testing-library/jest-dom setup
- [X] T008 [P] Update .gitignore to exclude coverage/, test-results/, playwright-report/, .playwright/

**Completion Criteria**:
- `npm run test:unit` runs without errors (0 tests OK)
- `npm run test:e2e` starts dev server successfully

---

## Phase 3: User Story 1 - Unit Tests for Components/Composables (Priority P1) (7 tasks)

**Goal**: Enable developers to run fast unit tests for Vue components and composables

**User Story**: As a developer, I need to run unit tests for Vue components and composables to verify that individual units of code work correctly in isolation.

**Dependencies**: Phase 2 (configs) must be complete

**Why Independent**: Unit testing is the foundation. Can be delivered without E2E tests and still provides immediate value (fast feedback, regression prevention).

### Tasks

- [X] T009 [P] [US1] Create test/unit/ directory structure (composables/, utils/ subdirectories)
- [X] T010 [P] [US1] Write unit test for useRole composable in test/unit/composables/useRole.test.ts
- [X] T011 [P] [US1] Write unit test for useUsers composable in test/unit/composables/useUsers.test.ts
- [X] T012 [P] [US1] Write unit test for useContentI18n composable in test/unit/composables/useContentI18n.test.ts
- [X] T013 [US1] Create test/nuxt/ directory structure (components/, server/api/ subdirectories)
- [X] T014 [P] [US1] Write component test for UserList in test/nuxt/components/UserList.spec.ts using mountSuspended
- [X] T015 [P] [US1] Write component test for UserFilters in test/nuxt/components/UserFilters.spec.ts using mountSuspended

**Completion Criteria**:
- `npm run test:unit` executes successfully in < 10 seconds
- At least 10 unit tests passing
- Coverage report generated with `npm run test:coverage`
- All composable business logic tested

**Independent Test**: Run `npm run test:unit` and verify all tests pass. Coverage > 50% for tested files.

**Success Criteria Met**:
- SC-001: Unit tests run in < 10 seconds ✅

---

## Phase 4: User Story 2 - E2E Tests for Critical User Flows (Priority P2) (8 tasks)

**Goal**: Enable E2E testing of complete user journeys in a real browser

**User Story**: As a QA engineer or developer, I need to run end-to-end tests that simulate real user interactions to verify complete user journeys work correctly.

**Dependencies**: Phase 2 (Playwright config) must be complete. Can run in parallel with Phase 3 if desired.

**Why Independent**: E2E tests validate integration and user experience. Can be delivered after unit tests but adds different value (integration testing vs unit isolation).

### Tasks

- [X] T016 [US2] Create test/e2e/ directory structure
- [X] T017 [P] [US2] Create test/e2e/global-setup.ts for authentication (auto-login test user)
- [X] T018 [P] [US2] Create test/e2e/global-teardown.ts for cleanup (optional)
- [X] T019 [P] [US2] Create test/e2e/fixtures.ts with custom test fixtures (authenticated page objects)
- [X] T020 [P] [US2] Write E2E test for authentication flow in test/e2e/auth.e2e.ts (login, logout, signup flows)
- [X] T021 [P] [US2] Write E2E test for homepage in test/e2e/homepage.e2e.ts (basic navigation, visibility checks)
- [X] T022 [P] [US2] Write E2E test for user management in test/e2e/user-management.e2e.ts (view users, filter, edit role, delete)
- [X] T023 [US2] Verify Playwright captures screenshots on failure and generates HTML report

**Completion Criteria**:
- `npm run test:e2e` launches browser and executes tests
- At least 5 E2E scenarios passing
- Screenshots captured on failure
- Playwright HTML report generated

**Independent Test**: Run `npm run test:e2e` and verify all E2E tests pass. Check test-results/ for artifacts.

**Success Criteria Met**:
- SC-002: E2E tests execute in < 5 minutes ✅
- SC-006: Screenshots available for debugging ✅

---

## Phase 5: User Story 3 - Test Results & Coverage Reports (Priority P3) (2 tasks)

**Goal**: Enable viewing of test execution results and code coverage metrics

**User Story**: As a development team member, I need to view test execution results and code coverage to understand test health and identify untested code.

**Dependencies**: Phase 3 (unit tests) must be complete for coverage data

**Why Independent**: Reporting is an enhancement to existing tests. Can be delivered incrementally as tests are added.

### Tasks

- [X] T024 [US3] Verify coverage HTML report generation (npm run test:coverage opens coverage/index.html)
- [X] T025 [US3] Verify Playwright HTML report (npm run test:e2e generates playwright-report/index.html)

**Completion Criteria**:
- HTML coverage report shows line/branch/function percentages
- Playwright report shows test duration, pass/fail counts, failure details
- Reports are viewable in browser

**Independent Test**: Run `npm run test:coverage` and open `coverage/index.html`. Verify coverage percentages displayed.

**Success Criteria Met**:
- SC-003: Coverage reports generated in < 5 seconds ✅

---

## Phase 6: CI/CD Integration & Polish (5 tasks)

**Goal**: Automate testing in GitHub Actions and optimize test execution

**Dependencies**: All user stories (US1-US3) complete

### Tasks

- [X] T026 [P] Create .github/workflows/test.yml with jobs: unit-tests (Node 18/20 matrix), e2e-tests, typecheck, lint
- [X] T027 Configure coverage upload to Codecov in GitHub Actions workflow
- [X] T028 Configure Playwright artifact upload on failure in GitHub Actions workflow
- [X] T029 [P] Add test utilities (factory functions for mock data, shared test helpers in test/utils/)
- [X] T030 Run all tests locally (npm run test:all) and verify execution time < 15 minutes total

**Completion Criteria**:
- GitHub Actions workflow runs on PR
- All test jobs execute in CI
- Coverage uploaded to Codecov
- Playwright artifacts available on failure
- Total test time < 15 minutes

**Final Validation Checklist**:
- ✅ Unit tests run in < 10 seconds
- ✅ E2E tests run in < 5 minutes
- ✅ Coverage >= 70% lines (when tests added for existing code)
- ✅ All critical flows have E2E tests
- ✅ CI workflow blocks merge on failure
- ✅ Test artifacts (screenshots, traces) available for debugging

---

## Dependencies Graph

```
Phase 1: Setup (T001-T004)
  ↓
Phase 2: Configuration (T005-T008)
  ↓
┌─────────────────────────┬─────────────────────────┐
│ Phase 3: US1 - Unit     │ Phase 4: US2 - E2E      │
│ (T009-T015)             │ (T016-T023)             │
│ (Can run in parallel)   │ (Can run in parallel)   │
└─────────────────────────┴─────────────────────────┘
  ↓
Phase 5: US3 - Reports (T024-T025)
  ↓
Phase 6: CI/CD & Polish (T026-T030)
```

**Key Dependencies**:
- Phase 2 BLOCKS all user stories (configs required)
- US1 and US2 are INDEPENDENT of each other (can develop in parallel)
- US3 depends on US1 (need tests for coverage) but is lightweight
- Phase 6 requires all user stories complete

---

## Parallel Execution Examples

### Phase 1 (All Parallel)
```bash
# Can install simultaneously (separate npm packages)
- T001 [P] Vitest dependencies
- T002 [P] Nuxt test utilities
- T004 [P] NPM scripts
# T003 must run after T002 (Playwright browser install)
```

### Phase 2 (Partial Parallel)
```bash
# Can create simultaneously (independent config files)
- T005 vitest.config.ts
- T006 playwright.config.ts
- T007 test/setup.ts
- T008 [P] .gitignore
```

### Phase 3 (US1) - Mostly Parallel
```bash
# Can write simultaneously (different test files)
- T010 [P] useRole.test.ts
- T011 [P] useUsers.test.ts
- T012 [P] useContentI18n.test.ts
- T014 [P] UserList.spec.ts
- T015 [P] UserFilters.spec.ts
# T009, T013 must complete first (directory setup)
```

### Phase 4 (US2) - Mostly Parallel
```bash
# Can write simultaneously (different E2E test files)
- T017 [P] global-setup.ts
- T018 [P] global-teardown.ts
- T019 [P] fixtures.ts
- T020 [P] auth.e2e.ts
- T021 [P] homepage.e2e.ts
- T022 [P] user-management.e2e.ts
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phase 1 + Phase 2 + Phase 3 (US1) = Minimum Shippable Increment**

This delivers:
- ✅ Unit test infrastructure configured
- ✅ At least 10 unit tests for critical composables
- ✅ Fast feedback loop (< 10s test execution)
- ✅ Coverage reporting capability

**Value**: Developers can immediately start testing composables and components without manual browser testing. Regression prevention from day 1.

### Incremental Delivery

**Iteration 1** (MVP - US1 only):
- Phase 1: Setup (4 tasks)
- Phase 2: Configuration (4 tasks)
- Phase 3: Unit Tests (7 tasks)
- **Total**: 15 tasks → 54% of feature
- **Time**: ~5 hours

**Iteration 2** (Add E2E):
- Phase 4: E2E Tests (8 tasks)
- **Total**: +8 tasks → 82% of feature
- **Time**: +3 hours

**Iteration 3** (Reports + CI/CD):
- Phase 5: Reports (2 tasks)
- Phase 6: CI/CD (5 tasks)
- **Total**: 28 tasks → 100% complete
- **Time**: +2 hours

### Test-Driven Approach

This feature IS the test infrastructure, so traditional TDD doesn't apply. However, we validate each phase:
1. After Phase 2: Verify test commands run (0 tests OK)
2. After Phase 3: Verify unit tests pass
3. After Phase 4: Verify E2E tests pass
4. After Phase 6: Verify CI workflow runs

---

## Quality Gates

**After Each Phase**:
- [ ] All tasks in phase complete (checkboxes marked)
- [ ] Test commands execute without errors
- [ ] Manual testing confirms phase goal met

**Before Phase 6**:
- [ ] All user stories (US1-US3) independently tested
- [ ] Unit tests run in < 10 seconds
- [ ] E2E tests run in < 5 minutes
- [ ] Coverage reports generated successfully

**Final Release Gate**:
- [ ] All 28 tasks complete
- [ ] GitHub Actions workflow runs successfully
- [ ] Coverage >= 70% (when tests added for existing code)
- [ ] All critical flows have E2E tests
- [ ] Test execution time < 15 minutes total

---

## Notes

**File Modifications** (existing files):
- `package.json` - Add test scripts
- `.gitignore` - Exclude test artifacts

**New Files Created**:
- `vitest.config.ts` (Vitest configuration)
- `playwright.config.ts` (Playwright configuration)
- `test/setup.ts` (global test setup)
- `test/unit/**/*.test.ts` (unit tests)
- `test/nuxt/**/*.spec.ts` (component tests)
- `test/e2e/**/*.e2e.ts` (E2E tests)
- `.github/workflows/test.yml` (CI workflow)

**No Database Changes**: Tests use existing local Supabase instance, no migrations needed.

**No New Middleware**: Tests validate existing functionality.

**Estimated Time**:
- Phase 1: 0.5 hours
- Phase 2: 1 hour
- Phase 3 (US1): 3 hours
- Phase 4 (US2): 3 hours
- Phase 5 (US3): 0.5 hours
- Phase 6: 2 hours
- **Total**: ~10 hours (initial setup + first tests)
