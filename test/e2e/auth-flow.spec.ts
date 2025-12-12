import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Signup Flow', () => {
    test('should allow a new user to sign up', async ({ page }) => {
      // Navigate to signup page
      await page.goto('/signup')

      // Fill in signup form
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)

      // Submit form
      await page.click('button[type="submit"]')

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Verify user is on dashboard
      expect(page.url()).toContain('/dashboard')

      // Verify user info is displayed
      await expect(page.getByText(testUser.name)).toBeVisible()
    })

    test('should show error for duplicate email', async ({ page }) => {
      // Use a known existing email
      await page.goto('/signup')

      await page.fill('input[name="email"]', 'admin@test.com')
      await page.fill('input[name="password"]', 'password123')
      await page.fill('input[name="name"]', 'Duplicate User')

      await page.click('button[type="submit"]')

      // Wait for error message
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })

      // Verify error is displayed
      await expect(page.getByText(/email/i)).toBeVisible()
    })

    test('should validate password length', async ({ page }) => {
      await page.goto('/signup')

      await page.fill('input[name="email"]', 'newuser@example.com')
      await page.fill('input[name="password"]', 'short')
      await page.fill('input[name="name"]', 'New User')

      await page.click('button[type="submit"]')

      // Verify validation error is shown
      await expect(page.getByText(/8 characters/i)).toBeVisible()
    })

    test('should redirect authenticated users away from signup', async ({ page }) => {
      // First signup
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Try to access signup again
      await page.goto('/signup')

      // Should be redirected to dashboard
      await page.waitForURL('/dashboard', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Create a user first
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Logout
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })
    })

    test('should allow an existing user to login', async ({ page }) => {
      await page.goto('/login')

      // Fill in login form
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)

      // Submit form
      await page.click('button[type="submit"]')

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Verify user is on dashboard
      expect(page.url()).toContain('/dashboard')

      // Verify user info is displayed
      await expect(page.getByText(testUser.name)).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', 'wrongpassword')

      await page.click('button[type="submit"]')

      // Wait for error message
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })

      // Verify error is displayed
      await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible()
    })

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="email"]', 'nonexistent@example.com')
      await page.fill('input[name="password"]', 'password123')

      await page.click('button[type="submit"]')

      // Wait for error message
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })

      // Verify error is displayed
      await expect(page.getByText(/not found|invalid/i)).toBeVisible()
    })

    test('should redirect to original page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/dashboard')

      // Should be redirected to login with redirect query param
      await page.waitForURL(/\/login\?redirect=/, { timeout: 5000 })
      expect(page.url()).toContain('redirect=%2Fdashboard')

      // Login
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.click('button[type="submit"]')

      // Should be redirected back to original page
      await page.waitForURL('/dashboard', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })
    })

    test('should logout and redirect to home', async ({ page }) => {
      // Click logout button
      await page.click('button:has-text("Logout")')

      // Wait for redirect to home
      await page.waitForURL('/', { timeout: 5000 })

      // Verify user is on home page
      expect(page.url()).toBe(`${page.url().split('/').slice(0, 3).join('/')}/`)

      // Verify user cannot access protected pages
      await page.goto('/dashboard')
      await page.waitForURL(/\/login/, { timeout: 5000 })
      expect(page.url()).toContain('/login')
    })

    test('should show logout success message', async ({ page }) => {
      await page.click('button:has-text("Logout")')

      // Wait for success toast
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })

      // Verify success message is displayed
      await expect(page.getByText(/logout|déconnexion/i)).toBeVisible()
    })
  })

  test.describe('Session Persistence', () => {
    test('should persist session across page refreshes', async ({ page }) => {
      // Login
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Refresh page
      await page.reload()

      // Verify user is still authenticated
      expect(page.url()).toContain('/dashboard')
      await expect(page.getByText(testUser.name)).toBeVisible()
    })

    test('should persist session across navigation', async ({ page }) => {
      // Login
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Navigate to different pages
      await page.goto('/profile')
      await expect(page.getByText(testUser.email)).toBeVisible()

      await page.goto('/settings')
      await expect(page.getByText(testUser.name)).toBeVisible()

      // Verify still authenticated
      await page.goto('/dashboard')
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('Password Migration', () => {
    test('should support bcrypt passwords from Better Auth', async ({ page }) => {
      // This test assumes there are existing users with bcrypt passwords
      // They should be able to login and passwords will be migrated to scrypt

      await page.goto('/login')

      // Try to login with a user that has a bcrypt password
      await page.fill('input[name="email"]', 'legacy@test.com')
      await page.fill('input[name="password"]', 'legacypassword123')

      await page.click('button[type="submit"]')

      // Should successfully login
      await page.waitForURL('/dashboard', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')

      // Password should be automatically migrated to scrypt
      // Logout and login again to verify migration worked
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })

      await page.goto('/login')
      await page.fill('input[name="email"]', 'legacy@test.com')
      await page.fill('input[name="password"]', 'legacypassword123')
      await page.click('button[type="submit"]')

      // Should still work after migration
      await page.waitForURL('/dashboard', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })
  })
})
