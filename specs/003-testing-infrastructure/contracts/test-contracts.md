# Test Contracts: Testing Infrastructure

**Feature**: 003-testing-infrastructure
**Date**: 2025-12-04

## Overview

This document defines the contracts (interfaces, configuration schemas, and expected behaviors) for the testing infrastructure. Unlike API contracts, these are testing tool configurations and interfaces that the test suite must implement.

## Configuration Contracts

### Vitest Configuration Contract

**File**: `vitest.config.ts`
**Required Properties**:

```typescript
interface VitestConfig {
  test: {
    globals: boolean              // MUST be true for global test functions
    environment: 'node' | 'nuxt' // Test environment
    coverage: {
      provider: 'v8'              // MUST use v8 for performance
      reporter: string[]          // MUST include ['text', 'json', 'html', 'lcov']
      include: string[]           // App code only
      exclude: string[]           // node_modules, .nuxt, tests
      thresholds: {
        lines: number             // MUST be >= 70
        functions: number         // MUST be >= 70
        branches: number          // MUST be >= 65
        statements: number        // MUST be >= 70
      }
    }
    setupFiles: string[]          // Global setup file
    projects: Project[]           // 'unit' + 'nuxt' projects
  }
}
```

**Validation**:
- ✅ `globals: true` enables `describe`, `it`, `expect` without imports
- ✅ `environment: 'node'` for unit tests (fast, no DOM)
- ✅ `environment: 'nuxt'` for Nuxt tests (full runtime)
- ✅ Coverage thresholds block CI if not met

### Playwright Configuration Contract

**File**: `playwright.config.ts`
**Required Properties**:

```typescript
interface PlaywrightConfig {
  testDir: string                 // MUST be './test/e2e'
  testMatch: string               // MUST match '**/*.e2e.ts'
  timeout: number                 // MUST be <= 30000 (30s per test)
  fullyParallel: boolean          // MUST be true for speed
  workers: number | undefined     // 1 in CI, auto locally
  reporter: Reporter[]            // MUST include html, json, junit
  outputDir: string               // Artifact directory
  webServer: {
    command: string               // MUST be 'npm run dev'
    url: string                   // MUST be 'http://localhost:3000'
    reuseExistingServer: boolean  // true locally, false in CI
    timeout: number               // MUST be <= 120000 (2min)
  }
  use: {
    baseURL: string               // MUST match webServer.url
    screenshot: 'on' | 'off' | 'only-on-failure'  // 'only-on-failure'
    video: 'on' | 'off' | 'retain-on-failure'     // 'retain-on-failure'
    trace: 'on' | 'off' | 'on-first-retry'        // 'on-first-retry'
  }
  projects: BrowserProject[]      // MUST include Chromium
}
```

**Validation**:
- ✅ `webServer` auto-starts Nuxt dev server for tests
- ✅ `screenshot: 'only-on-failure'` reduces artifact size
- ✅ `trace: 'on-first-retry'` captures debugging info
- ✅ `fullyParallel: true` speeds up E2E execution

## Test File Contracts

### Unit Test File Contract

**Pattern**: `test/unit/**/*.test.ts`
**Structure**:

```typescript
import { describe, it, expect } from 'vitest'

describe('ComponentName or FunctionName', () => {
  // Optional: Setup/teardown
  beforeEach(() => {
    // Reset state before each test
  })

  describe('methodName or feature', () => {
    it('describes expected behavior', () => {
      // Arrange: Setup test data
      const input = 'test-value'

      // Act: Execute function
      const result = functionUnderTest(input)

      // Assert: Verify outcome
      expect(result).toBe('expected-value')
    })

    it('handles edge case: empty input', () => {
      expect(functionUnderTest('')).toBe('')
    })

    it('throws error when input is invalid', () => {
      expect(() => functionUnderTest(null)).toThrow('Invalid input')
    })
  })
})
```

**Requirements**:
- ✅ MUST use `describe` blocks for grouping related tests
- ✅ MUST use descriptive test names (no "test 1", "test 2")
- ✅ MUST follow AAA pattern (Arrange, Act, Assert)
- ✅ MUST test happy path + edge cases + error conditions
- ✅ MUST be independent (no shared state between tests)

### Component Test File Contract

**Pattern**: `test/nuxt/components/**/*.spec.ts`
**Structure**:

```typescript
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils'
import { screen } from '@testing-library/vue'
import ComponentName from '~/app/components/ComponentName.vue'

describe('ComponentName', () => {
  it('renders expected content', async () => {
    await mountSuspended(ComponentName, {
      props: {
        requiredProp: 'value',
      },
    })

    // Query by accessibility (preferred)
    const heading = screen.getByRole('heading', { name: /expected text/i })
    expect(heading).toBeDefined()
  })

  it('emits event when button clicked', async () => {
    const wrapper = await mountSuspended(ComponentName)

    const button = screen.getByRole('button', { name: /click me/i })
    await button.click()

    expect(wrapper.emitted('custom-event')).toBeTruthy()
  })

  it('displays error message on invalid input', async () => {
    await mountSuspended(ComponentName, {
      props: {
        error: 'Invalid input',
      },
    })

    const errorMessage = screen.getByText(/invalid input/i)
    expect(errorMessage).toBeDefined()
  })
})
```

**Requirements**:
- ✅ MUST use `mountSuspended` for Nuxt components (handles async setup)
- ✅ MUST query by accessibility (role, label, text) over test IDs
- ✅ MUST test user interactions (click, type, submit)
- ✅ MUST verify rendered output (text, attributes, visibility)
- ✅ MUST test error states and loading states

### E2E Test File Contract

**Pattern**: `test/e2e/**/*.e2e.ts`
**Structure**:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to starting page
    await page.goto('/feature-page')
  })

  test('completes user journey successfully', async ({ page }) => {
    // Step 1: Interact with UI
    await page.fill('input[name="email"]', 'user@example.com')
    await page.fill('input[name="password"]', 'password123')

    // Step 2: Submit form
    await page.click('button[type="submit"]')

    // Step 3: Verify outcome
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Welcome')).toBeVisible()
  })

  test('displays error on invalid input', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    // Verify error message
    await expect(page.locator('text=Invalid email')).toBeVisible()
  })

  test('navigates correctly using keyboard', async ({ page }) => {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // Verify navigation occurred
    await expect(page).toHaveURL('/next-page')
  })
})
```

**Requirements**:
- ✅ MUST test complete user journeys (multi-step workflows)
- ✅ MUST use semantic selectors (role, text, label) over CSS selectors
- ✅ MUST use `waitForURL()`, `waitForSelector()` (no hardcoded `setTimeout`)
- ✅ MUST verify outcomes (URL, text, visibility) not implementation
- ✅ MUST test keyboard navigation for accessibility

## NPM Scripts Contract

**File**: `package.json`
**Required Scripts**:

```json
{
  "scripts": {
    "test": "vitest",                         // Default: watch mode
    "test:unit": "vitest run --project unit", // Run unit tests once
    "test:nuxt": "vitest run --project nuxt", // Run Nuxt tests once
    "test:coverage": "vitest run --coverage", // Generate coverage
    "test:ui": "vitest --ui",                 // Open Vitest UI
    "test:e2e": "playwright test",            // Run E2E tests
    "test:e2e:ui": "playwright test --ui",    // Open Playwright UI
    "test:e2e:debug": "playwright test --debug", // Debug mode
    "test:all": "npm run test:unit && npm run test:nuxt && npm run test:e2e" // All tests
  }
}
```

**Requirements**:
- ✅ `test:unit` MUST run quickly (< 10s)
- ✅ `test:coverage` MUST fail if thresholds not met
- ✅ `test:e2e` MUST auto-start dev server
- ✅ `test:all` MUST run all test types sequentially

## CI/CD Contract

**File**: `.github/workflows/test.yml`
**Required Jobs**:

```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Run: npm run test:unit
      - Upload coverage (20.x only)

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Install Playwright browsers
      - Run: npm run test:e2e
      - Upload Playwright artifacts
```

**Requirements**:
- ✅ Unit tests MUST run on Node 18 + 20 (matrix)
- ✅ E2E tests MUST upload artifacts on failure
- ✅ Coverage MUST be uploaded to Codecov
- ✅ Jobs MUST fail if tests fail or coverage drops

## Test Data Contract

### Unit/Component Tests

**Mock User Object**:
```typescript
{
  id: string            // UUID format
  email: string         // Valid email
  name: string | null   // Optional
  role: 'user' | 'admin' | 'contributor'
  createdAt: Date       // ISO 8601 string
  emailVerified: boolean
  image: string | null  // URL or null
}
```

### E2E Tests

**Test User Credentials**:
```typescript
{
  email: `test-user-${workerIndex}@example.com`  // Unique per worker
  password: 'TestPassword123'                     // Meets validation
  role: 'user' | 'admin' | 'contributor'         // Test role
}
```

**Requirements**:
- ✅ Test users MUST be unique per worker (parallel execution)
- ✅ Passwords MUST meet app validation rules (8+ chars)
- ✅ Test data MUST be cleaned up after tests (optional)

## Assertion Contract

### Vitest Assertions

**Common Patterns**:
```typescript
// Equality
expect(value).toBe(expected)       // Strict equality (===)
expect(value).toEqual(expected)    // Deep equality

// Truthiness
expect(value).toBeTruthy()         // Boolean true
expect(value).toBeFalsy()          // Boolean false
expect(value).toBeDefined()        // Not undefined
expect(value).toBeNull()           // Exactly null

// Numbers
expect(number).toBeGreaterThan(10)
expect(number).toBeLessThanOrEqual(100)
expect(number).toBeCloseTo(3.14, 2) // Floating point

// Strings
expect(string).toContain('substring')
expect(string).toMatch(/regex/)

// Arrays
expect(array).toHaveLength(3)
expect(array).toContain('item')

// Functions
expect(fn).toThrow('error message')
expect(fn).toHaveBeenCalled()

// Promises
await expect(promise).resolves.toBe('value')
await expect(promise).rejects.toThrow('error')
```

### Playwright Assertions

**Common Patterns**:
```typescript
// Visibility
await expect(locator).toBeVisible()
await expect(locator).toBeHidden()

// Text content
await expect(locator).toHaveText('expected text')
await expect(locator).toContainText('partial text')

// Attributes
await expect(locator).toHaveAttribute('href', '/path')
await expect(locator).toHaveClass('active')

// State
await expect(locator).toBeDisabled()
await expect(locator).toBeEnabled()
await expect(locator).toBeChecked()

// Count
await expect(locator).toHaveCount(5)

// URL
await expect(page).toHaveURL('/expected-path')
await expect(page).toHaveURL(/regex-pattern/)
```

## Coverage Contract

**Minimum Thresholds**:
- Lines: 70%
- Functions: 70%
- Branches: 65%
- Statements: 70%

**Exclusions** (not counted toward coverage):
- `node_modules/`
- `.nuxt/` (generated code)
- `dist/` (build output)
- `**/*.config.ts` (configuration files)
- `**/*.{test,spec,e2e}.ts` (test files)
- `test/` (test utilities)

**Requirements**:
- ✅ All composables MUST have >= 80% coverage
- ✅ All API endpoints MUST have >= 75% coverage
- ✅ Critical components MUST have >= 70% coverage
- ✅ Coverage MUST not drop below thresholds in CI

## Summary

These contracts ensure consistency across the testing infrastructure. All tests MUST adhere to these patterns, configurations, and requirements to maintain test quality, performance, and reliability.
