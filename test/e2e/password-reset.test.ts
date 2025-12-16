import { test, expect } from '@playwright/test'

// Mock Resend to avoid sending real emails in tests
import { mockResend } from '../utils/auth-helpers'

test.describe('Password Reset Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  }

  test.beforeEach(async ({ page }) => {
    // Mock Resend to prevent real email sending
    await mockResend(page)
    await page.goto('/')
  })

  test.describe('User Story 1: Forgot Password Request', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test user first
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      
      // Logout to test password reset
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })
    })

    test('T016: User can request password reset with valid email', async ({ page }) => {
      // Navigate to login page and click "Forgot Password" link
      await page.goto('/login')
      await page.click('text=Mot de passe oublié')
      
      // Should be redirected to forgot password page
      await page.waitForURL('/auth/forgot-password', { timeout: 5000 })
      expect(page.url()).toContain('/auth/forgot-password')
      
      // Fill in email and submit
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      
      // Should show success message (mocked email sent)
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/email|envoyé|sent/i)).toBeVisible()
      
      // Verify the email was sent (check console logs for mocked Resend call)
      const consoleLogs = await page.evaluate(() => {
        // @ts-expect-error: window.mockedResendCalls is a test-only property added by the mock setup
        return window.mockedResendCalls || []
      })
      
      expect(consoleLogs.length).toBeGreaterThan(0)
      expect(consoleLogs[0].to).toContain(testUser.email)
    })

    test('T016: Shows same message for existing and non-existing emails (anti-enumeration)', async ({ page }) => {
      // Test with existing user
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      const existingUserMessage = await page.textContent('[role="alert"]')
      
      // Test with non-existing user
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', 'nonexistent@example.com')
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      const nonExistingUserMessage = await page.textContent('[role="alert"]')
      
      // Messages should be identical to prevent user enumeration
      expect(existingUserMessage).toBe(nonExistingUserMessage)
    })

    test('T016: Rate limiting prevents multiple requests in short time', async ({ page }) => {
      // First request should succeed
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      
      // Second request within rate limit period should be rejected
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      
      // Should show rate limit error
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/rate|limit|trop|fréquent/i)).toBeVisible()
    })

    test('T016: Validates email format', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      
      // Test with invalid email format
      await page.fill('input[name="email"]', 'invalid-email')
      await page.click('button[type="submit"]')
      
      // Should show validation error
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/email|invalide|format/i)).toBeVisible()
    })

    test('T016: Redirects to login after successful request', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      
      // After showing success message, should redirect to login
      await page.waitForURL('/login', { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('User Story 2: Password Reset with Valid Token', () => {
    let resetToken: string

    test.beforeEach(async ({ page }) => {
      // Create a test user
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      
      // Request password reset to get a token
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      
      // Extract token from mocked email
      const consoleLogs = await page.evaluate(() => {
        // @ts-expect-error: window.mockedResendCalls is a test-only property added by the mock setup
        return window.mockedResendCalls || []
      })
      
      // Extract token from the email HTML
      const emailHtml = consoleLogs[0].html
      const tokenMatch = emailHtml.match(/token=([A-Za-z0-9_-]+)/)
      resetToken = tokenMatch ? tokenMatch[1] : ''
      
      // Logout
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })
    })

    test('T026: User can reset password with valid token', async ({ page }) => {
      // Navigate to reset password page with token
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      
      // Should show reset password form
      await expect(page.getByText(/nouveau|password|reset/i)).toBeVisible()
      
      // Fill in new password
      const newPassword = 'NewPassword123!'
      await page.fill('input[name="password"]', newPassword)
      await page.fill('input[name="passwordConfirm"]', newPassword)
      await page.click('button[type="submit"]')
      
      // Should show success message
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/réinitialisé|success|réussi/i)).toBeVisible()
      
      // Should redirect to login page
      await page.waitForURL('/login', { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })

    test('T026: User can login with new password after reset', async ({ page }) => {
      // Reset password
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      const newPassword = 'NewPassword123!'
      await page.fill('input[name="password"]', newPassword)
      await page.fill('input[name="passwordConfirm"]', newPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('/login', { timeout: 10000 })
      
      // Login with new password
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', newPassword)
      await page.click('button[type="submit"]')
      
      // Should successfully login
      await page.waitForURL('/dashboard', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('T026: Token becomes invalid after use', async ({ page }) => {
      // First use of token should work
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      const newPassword = 'NewPassword123!'
      await page.fill('input[name="password"]', newPassword)
      await page.fill('input[name="passwordConfirm"]', newPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('/login', { timeout: 10000 })
      
      // Try to use the same token again
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      await page.fill('input[name="password"]', 'AnotherPassword123!')
      await page.fill('input[name="passwordConfirm"]', 'AnotherPassword123!')
      await page.click('button[type="submit"]')
      
      // Should show error for used token
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/utilisé|used|invalide/i)).toBeVisible()
    })
  })

  test.describe('User Story 3: Error Handling and Validation', () => {
    test('T037: Shows error for invalid token', async ({ page }) => {
      await page.goto('/auth/reset-password?token=invalid-token')
      
      // Should show error message
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/invalide|invalid|token/i)).toBeVisible()
    })

    test('T037: Shows error for expired token', async ({ page }) => {
      // This would need to be tested with a token that's artificially expired
      // For now, we'll just test the UI shows appropriate error
      await page.goto('/auth/reset-password?token=expired-token')
      
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/expiré|expired|token/i)).toBeVisible()
    })

    test('T037: Validates password length', async ({ page }) => {
      // Create user and get reset token
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      
      const consoleLogs = await page.evaluate(() => {
        // @ts-expect-error: window.mockedResendCalls is a test-only property added by the mock setup
        return window.mockedResendCalls || []
      })
      
      const emailHtml = consoleLogs[0].html
      const tokenMatch = emailHtml.match(/token=([A-Za-z0-9_-]+)/)
      const resetToken = tokenMatch ? tokenMatch[1] : ''
      
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })
      
      // Try to reset with too short password
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      await page.fill('input[name="password"]', 'short')
      await page.fill('input[name="passwordConfirm"]', 'short')
      await page.click('button[type="submit"]')
      
      // Should show validation error
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/8 characters|caractères/i)).toBeVisible()
    })

    test('T037: Validates password confirmation match', async ({ page }) => {
      // Create user and get reset token
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      
      const consoleLogs = await page.evaluate(() => {
        // @ts-expect-error: window.mockedResendCalls is a test-only property added by the mock setup
        return window.mockedResendCalls || []
      })
      
      const emailHtml = consoleLogs[0].html
      const tokenMatch = emailHtml.match(/token=([A-Za-z0-9_-]+)/)
      const resetToken = tokenMatch ? tokenMatch[1] : ''
      
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })
      
      // Try to reset with mismatched passwords
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      await page.fill('input[name="password"]', 'Password123!')
      await page.fill('input[name="passwordConfirm"]', 'DifferentPassword123!')
      await page.click('button[type="submit"]')
      
      // Should show validation error
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/match|correspond|identique/i)).toBeVisible()
    })
  })

  test.describe('Accessibility Tests', () => {
    test('T051: Forgot password form has proper ARIA labels', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      
      // Check for ARIA attributes
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label')
      await expect(page.locator('button[type="submit"]')).toHaveAttribute('aria-label')
    })

    test('T052: Reset password form has proper ARIA labels', async ({ page }) => {
      // Create user and get reset token
      await page.goto('/signup')
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      await page.fill('input[name="name"]', testUser.name)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      
      await page.goto('/auth/forgot-password')
      await page.fill('input[name="email"]', testUser.email)
      await page.click('button[type="submit"]')
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      
      const consoleLogs = await page.evaluate(() => {
        // @ts-expect-error: window.mockedResendCalls is a test-only property added by the mock setup
        return window.mockedResendCalls || []
      })
      
      const emailHtml = consoleLogs[0].html
      const tokenMatch = emailHtml.match(/token=([A-Za-z0-9_-]+)/)
      const resetToken = tokenMatch ? tokenMatch[1] : ''
      
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })
      
      await page.goto(`/auth/reset-password?token=${resetToken}`)
      
      // Check for ARIA attributes
      await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label')
      await expect(page.locator('input[name="passwordConfirm"]')).toHaveAttribute('aria-label')
      await expect(page.locator('button[type="submit"]')).toHaveAttribute('aria-label')
    })
  })
})