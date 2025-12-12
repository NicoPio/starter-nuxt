import { test, expect } from '@playwright/test'

test.describe('OAuth Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('OAuth Provider Buttons', () => {
    test('should display OAuth provider buttons on signup page', async ({ page }) => {
      await page.goto('/signup')

      // Check for OAuth buttons
      await expect(page.getByRole('button', { name: /github/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /apple/i })).toBeVisible()
    })

    test('should display OAuth provider buttons on login page', async ({ page }) => {
      await page.goto('/login')

      // Check for OAuth buttons
      await expect(page.getByRole('button', { name: /github/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /apple/i })).toBeVisible()
    })
  })

  test.describe('GitHub OAuth Flow', () => {
    test('should redirect to GitHub OAuth when clicking GitHub button', async ({ page }) => {
      await page.goto('/signup')

      // Click GitHub button
      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      // Wait for redirect
      await page.waitForURL(/github\.com/, { timeout: 10000 })

      // Verify we're on GitHub's OAuth page
      expect(page.url()).toContain('github.com')
      expect(page.url()).toContain('oauth/authorize')
    })

    test('should include correct OAuth parameters in GitHub redirect', async ({ page }) => {
      await page.goto('/signup')

      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      await page.waitForURL(/github\.com/, { timeout: 10000 })

      const url = new URL(page.url())

      // Verify OAuth parameters
      expect(url.searchParams.get('client_id')).toBeTruthy()
      expect(url.searchParams.get('scope')).toContain('user:email')
    })
  })

  test.describe('Google OAuth Flow', () => {
    test('should redirect to Google OAuth when clicking Google button', async ({ page }) => {
      await page.goto('/signup')

      // Click Google button
      const googleButton = page.getByRole('button', { name: /google/i })
      await googleButton.click()

      // Wait for redirect
      await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 })

      // Verify we're on Google's OAuth page
      expect(page.url()).toContain('accounts.google.com')
      expect(page.url()).toContain('oauth2')
    })

    test('should include correct OAuth parameters in Google redirect', async ({ page }) => {
      await page.goto('/signup')

      const googleButton = page.getByRole('button', { name: /google/i })
      await googleButton.click()

      await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 })

      const url = new URL(page.url())

      // Verify OAuth parameters
      expect(url.searchParams.get('client_id')).toBeTruthy()
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('scope')).toContain('email')
    })
  })

  test.describe('Apple OAuth Flow', () => {
    test('should redirect to Apple OAuth when clicking Apple button', async ({ page }) => {
      await page.goto('/signup')

      // Click Apple button
      const appleButton = page.getByRole('button', { name: /apple/i })
      await appleButton.click()

      // Wait for redirect
      await page.waitForURL(/appleid\.apple\.com/, { timeout: 10000 })

      // Verify we're on Apple's OAuth page
      expect(page.url()).toContain('appleid.apple.com')
      expect(page.url()).toContain('auth/authorize')
    })

    test('should include correct OAuth parameters in Apple redirect', async ({ page }) => {
      await page.goto('/signup')

      const appleButton = page.getByRole('button', { name: /apple/i })
      await appleButton.click()

      await page.waitForURL(/appleid\.apple\.com/, { timeout: 10000 })

      const url = new URL(page.url())

      // Verify OAuth parameters
      expect(url.searchParams.get('client_id')).toBeTruthy()
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('response_mode')).toBe('form_post')
    })
  })

  test.describe('OAuth Callback Handling', () => {
    test('should handle successful OAuth callback', async ({ page, context }) => {
      // Note: This test requires mocking OAuth provider responses
      // In a real test environment, you would use a mock OAuth server

      // Simulate OAuth callback with code
      await page.goto('/auth/github?code=mock_code_123&state=mock_state')

      // Wait for redirect after successful OAuth
      await page.waitForURL('/dashboard', { timeout: 10000 })

      // Verify user is authenticated
      expect(page.url()).toContain('/dashboard')
    })

    test('should handle OAuth callback errors', async ({ page }) => {
      // Simulate OAuth error callback
      await page.goto('/auth/github?error=access_denied&error_description=User+denied+access')

      // Wait for redirect to login or error page
      await page.waitForURL(/\/login|\/error/, { timeout: 10000 })

      // Verify error message is displayed
      await expect(page.getByText(/error|denied|failed/i)).toBeVisible()
    })

    test('should handle missing OAuth code parameter', async ({ page }) => {
      // Navigate to OAuth callback without code
      await page.goto('/auth/github')

      // Should redirect to login or show error
      await page.waitForURL(/\/login|\/error/, { timeout: 10000 })
    })
  })

  test.describe('OAuth Account Linking', () => {
    test('should create new account for first-time OAuth user', async ({ page, context }) => {
      // Note: This test requires a mock OAuth setup

      // Clear existing session
      await context.clearCookies()

      await page.goto('/signup')

      // Click OAuth button
      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      // After successful OAuth, should be on dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })

      // Verify new user is created and authenticated
      expect(page.url()).toContain('/dashboard')
    })

    test('should link OAuth account to existing user', async ({ page, context }) => {
      // First, create a regular account
      await page.goto('/signup')

      const testEmail = `test-${Date.now()}@example.com`
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', 'password123')
      await page.fill('input[name="name"]', 'Test User')
      await page.click('button[type="submit"]')

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Go to settings to link OAuth account
      await page.goto('/settings')

      // Click to link GitHub account
      const linkGithubButton = page.getByRole('button', { name: /link.*github/i })
      await linkGithubButton.click()

      // Should redirect to GitHub OAuth
      await page.waitForURL(/github\.com/, { timeout: 10000 })
      expect(page.url()).toContain('github.com')
    })

    test('should login with OAuth if account already exists', async ({ page, context }) => {
      // Note: This assumes an OAuth account already exists

      await page.goto('/login')

      // Click OAuth button for existing account
      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      // Should redirect to dashboard after OAuth
      await page.waitForURL('/dashboard', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('OAuth Session Management', () => {
    test('should persist OAuth session across page refreshes', async ({ page, context }) => {
      // Note: This requires a successful OAuth login first

      // Simulate OAuth login
      await page.goto('/auth/github?code=mock_code_123')
      await page.waitForURL('/dashboard', { timeout: 10000 })

      // Refresh page
      await page.reload()

      // Verify session is persisted
      expect(page.url()).toContain('/dashboard')
    })

    test('should logout OAuth users properly', async ({ page, context }) => {
      // Simulate OAuth login
      await page.goto('/auth/github?code=mock_code_123')
      await page.waitForURL('/dashboard', { timeout: 10000 })

      // Logout
      await page.click('button:has-text("Logout")')
      await page.waitForURL('/', { timeout: 5000 })

      // Verify logout
      expect(page.url()).not.toContain('/dashboard')

      // Try to access protected page
      await page.goto('/dashboard')
      await page.waitForURL(/\/login/, { timeout: 5000 })
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('OAuth Error Handling', () => {
    test('should handle network errors during OAuth', async ({ page }) => {
      await page.goto('/signup')

      // Simulate network error by blocking OAuth endpoint
      await page.route('**/auth/github**', route => route.abort())

      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      // Should show error message
      await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      await expect(page.getByText(/error|failed|network/i)).toBeVisible()
    })

    test('should handle invalid OAuth state parameter', async ({ page }) => {
      // Navigate with invalid state
      await page.goto('/auth/github?code=mock_code&state=invalid_state')

      // Should redirect to error page or login
      await page.waitForURL(/\/login|\/error/, { timeout: 10000 })

      // Verify error is shown
      await expect(page.getByText(/error|invalid|failed/i)).toBeVisible()
    })

    test('should handle expired OAuth tokens', async ({ page }) => {
      // Simulate expired token callback
      await page.goto('/auth/github?error=invalid_grant&error_description=Token+expired')

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 })

      // Verify error message
      await expect(page.getByText(/expired|error/i)).toBeVisible()
    })
  })

  test.describe('OAuth Security', () => {
    test('should use secure OAuth redirect URLs', async ({ page }) => {
      await page.goto('/signup')

      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      await page.waitForURL(/github\.com/, { timeout: 10000 })

      const url = new URL(page.url())
      const redirectUri = url.searchParams.get('redirect_uri')

      // Verify redirect URI is HTTPS
      expect(redirectUri).toBeTruthy()
      expect(redirectUri).toMatch(/^https:\/\//)
    })

    test('should include state parameter for CSRF protection', async ({ page }) => {
      await page.goto('/signup')

      const githubButton = page.getByRole('button', { name: /github/i })
      await githubButton.click()

      await page.waitForURL(/github\.com/, { timeout: 10000 })

      const url = new URL(page.url())
      const state = url.searchParams.get('state')

      // Verify state parameter exists
      expect(state).toBeTruthy()
      expect(state).toHaveLength(32) // Typical state parameter length
    })
  })
})
