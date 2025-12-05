# Quickstart: Testing Infrastructure

**Feature**: 003-testing-infrastructure
**Date**: 2025-12-04

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Core testing libraries
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @nuxt/test-utils @vitejs/plugin-vue
npm install -D @testing-library/vue @testing-library/jest-dom
npm install -D @playwright/test

# Install Playwright browsers (one-time)
npx playwright install chromium
```

### 2. Create Configuration Files

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
    },
    projects: [
      { name: 'unit', test: { include: ['test/unit/**/*.test.ts'] } },
      await defineVitestProject({ name: 'nuxt', test: { include: ['test/nuxt/**/*.spec.ts'], environment: 'nuxt' } }),
    ],
  },
})
```

**playwright.config.ts**:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
})
```

### 3. Add NPM Scripts (package.json)

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --project unit",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

### 4. Write Your First Tests

**Unit Test** (`test/unit/example.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'

describe('Math operations', () => {
  it('adds two numbers', () => {
    expect(1 + 1).toBe(2)
  })
})
```

**E2E Test** (`test/e2e/homepage.e2e.ts`):
```typescript
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})
```

### 5. Run Tests

```bash
# Run unit tests (watch mode)
npm test

# Run unit tests once
npm run test:unit

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 📚 Common Testing Scenarios

### Testing a Composable

```typescript
// test/unit/composables/useCounter.test.ts
import { describe, it, expect } from 'vitest'
import { useCounter } from '~/app/composables/useCounter'

describe('useCounter', () => {
  it('increments counter', () => {
    const { count, increment } = useCounter()
    expect(count.value).toBe(0)

    increment()
    expect(count.value).toBe(1)
  })
})
```

### Testing a Vue Component

```typescript
// test/nuxt/components/MyButton.spec.ts
import { mountSuspended } from '@nuxt/test-utils'
import { screen } from '@testing-library/vue'
import MyButton from '~/app/components/MyButton.vue'

describe('MyButton', () => {
  it('renders button text', async () => {
    await mountSuspended(MyButton, {
      props: { label: 'Click me' },
    })

    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeDefined()
  })
})
```

### Testing User Flow (E2E)

```typescript
// test/e2e/login.e2e.ts
import { test, expect } from '@playwright/test'

test('user can log in', async ({ page }) => {
  await page.goto('/login')

  await page.fill('input[type="email"]', 'user@example.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('text=Welcome')).toBeVisible()
})
```

## 🎯 Next Steps

1. **Add tests for existing features**: Start with critical composables and components
2. **Setup CI/CD**: Configure GitHub Actions to run tests on every PR
3. **Monitor coverage**: Track coverage trends over time
4. **Write E2E tests for critical paths**: Login, signup, core user journeys

## 📖 Documentation Links

- **Full Implementation Plan**: `./plan.md`
- **Research Document**: `./research.md`
- **Test Contracts**: `./contracts/test-contracts.md`
- **Vitest Docs**: https://vitest.dev/
- **Playwright Docs**: https://playwright.dev/

## 🆘 Troubleshooting

**Issue**: Tests fail with "Cannot find module"
**Fix**: Ensure `@nuxt/test-utils` is installed and `nuxt` environment is used for Nuxt tests

**Issue**: E2E tests timeout
**Fix**: Increase `webServer.timeout` in `playwright.config.ts` to 120000

**Issue**: Coverage below threshold
**Fix**: Add tests for uncovered code or adjust thresholds in `vitest.config.ts`

**Issue**: Flaky E2E tests
**Fix**: Use `waitForURL()`, `waitForSelector()` instead of hardcoded `setTimeout()`

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] Config files created (`vitest.config.ts`, `playwright.config.ts`)
- [ ] NPM scripts added
- [ ] First unit test passing
- [ ] First E2E test passing
- [ ] Coverage report generated
- [ ] CI/CD workflow configured (optional)
