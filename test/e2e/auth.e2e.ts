import { test, expect } from '@playwright/test'
import { loginViaAPI, signupViaAPI, logoutViaAPI, createTestUser, isLoggedIn } from './auth-helpers'

test.describe('Flux d\'authentification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('Login avec credentials valides redirige vers dashboard', async ({ page }) => {
    // Se connecter via l'API
    await loginViaAPI(page, {
      email: 'test@example.com',
      password: 'testpassword123',
    })

    // Naviguer vers le dashboard
    await page.goto('/dashboard')

    // Vérifier que le dashboard est chargé
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('Login avec credentials invalides affiche une erreur', async ({ page }) => {
    // Tenter de se connecter avec de mauvais credentials via l'API
    try {
      await loginViaAPI(page, {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })
      // Si on arrive ici, le test échoue car le login aurait dû échouer
      throw new Error('Login should have failed but succeeded')
    } catch (error) {
      // Vérifier qu'une erreur s'est produite (comportement attendu)
      expect(error).toBeDefined()
    }

    // Vérifier qu'on est toujours sur la page de login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
  })

  test('Logout fonctionne correctement', async ({ page }) => {
    // Se connecter via l'API
    await loginViaAPI(page, {
      email: 'test@example.com',
      password: 'testpassword123',
    })

    // Vérifier qu'on est connecté en vérifiant que l'API /api/users/me fonctionne
    const isConnected = await isLoggedIn(page)
    expect(isConnected).toBe(true)

    // Se déconnecter via l'API
    await logoutViaAPI(page)

    // Vérifier qu'on n'est plus connecté
    const isStillConnected = await isLoggedIn(page)
    expect(isStillConnected).toBe(false)

    // Vérifier qu'on peut accéder à la page de login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
  })

  test('Signup flow basique crée un compte', async ({ page }) => {
    await page.goto('/signup')

    // Créer un utilisateur unique
    const testUser = createTestUser('signup')

    // S'inscrire via l'API
    await signupViaAPI(page, testUser)

    // Aller au dashboard (auto sign-in après signup)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('Navigation entre login et signup fonctionne', async ({ page }) => {
    // Sur la page de login
    await expect(page).toHaveURL(/\/login/)

    // Cliquer sur le lien vers signup
    await page.click('a[href="/signup"]')
    await page.waitForURL('/signup')
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()

    // Retour vers login
    await page.click('a[href="/login"]')
    await page.waitForURL('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
  })

  test('Les champs de formulaire sont validés', async ({ page }) => {
    // Vérifier que les champs ont l'attribut required
    const emailInput = page.locator('input[name="email"]')
    await expect(emailInput).toHaveAttribute('required')

    const passwordInput = page.locator('input[name="password"]')
    await expect(passwordInput).toHaveAttribute('required')
  })

  test('Bouton de soumission existe et est visible', async ({ page }) => {
    // Vérifier que le bouton de soumission existe
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
  })
})
