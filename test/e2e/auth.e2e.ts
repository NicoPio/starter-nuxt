import { test, expect } from '@playwright/test'

test.describe('Flux d\'authentification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('Login avec credentials valides redirige vers dashboard', async ({ page }) => {
    // Remplir le formulaire
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')

    // Soumettre
    await page.click('button[type="submit"]')

    // Vérifier la redirection
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Vérifier que le dashboard est chargé
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('Login avec credentials invalides affiche une erreur', async ({ page }) => {
    // Remplir avec de mauvais credentials
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')

    // Soumettre
    await page.click('button[type="submit"]')

    // Vérifier qu'on reste sur la page de login
    await expect(page).toHaveURL(/\/auth\/login/)

    // Vérifier qu'un message d'erreur est affiché
    await expect(page.getByText(/invalid credentials|incorrect email or password/i)).toBeVisible()
  })

  test('Logout redirige vers login', async ({ page }) => {
    // D'abord se connecter
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Trouver et cliquer sur le bouton logout
    const logoutButton = page.getByRole('button', { name: /logout|sign out|déconnexion/i })
    await logoutButton.click()

    // Vérifier la redirection vers login
    await page.waitForURL('/auth/login')
    await expect(page.getByRole('heading', { name: /login|sign in|connexion/i })).toBeVisible()
  })

  test('Signup flow basique crée un compte', async ({ page }) => {
    await page.goto('/auth/signup')

    // Générer un email unique pour éviter les conflits
    const uniqueEmail = `test-${Date.now()}@example.com`

    // Remplir le formulaire d'inscription
    await page.fill('input[name="email"]', uniqueEmail)
    await page.fill('input[name="password"]', 'testpassword123')

    // Si il y a un champ de confirmation de mot de passe
    const confirmPasswordField = page.locator('input[name="confirmPassword"]')
    if (await confirmPasswordField.count() > 0) {
      await confirmPasswordField.fill('testpassword123')
    }

    // Soumettre
    await page.click('button[type="submit"]')

    // Vérifier la redirection vers dashboard (auto sign-in)
    await page.waitForURL('/dashboard', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('Navigation entre login et signup fonctionne', async ({ page }) => {
    // Sur la page de login
    await expect(page).toHaveURL(/\/auth\/login/)

    // Cliquer sur le lien vers signup
    await page.click('a[href="/auth/signup"]')
    await page.waitForURL('/auth/signup')
    await expect(page.getByRole('heading', { name: /sign up|create account|inscription/i })).toBeVisible()

    // Retour vers login
    await page.click('a[href="/auth/login"]')
    await page.waitForURL('/auth/login')
    await expect(page.getByRole('heading', { name: /login|sign in|connexion/i })).toBeVisible()
  })

  test('Les champs de formulaire sont validés', async ({ page }) => {
    // Essayer de soumettre sans remplir
    await page.click('button[type="submit"]')

    // Vérifier que des messages de validation apparaissent
    const emailInput = page.locator('input[name="email"]')
    await expect(emailInput).toHaveAttribute('required')

    const passwordInput = page.locator('input[name="password"]')
    await expect(passwordInput).toHaveAttribute('required')
  })

  test('Bouton de soumission affiche un état de chargement', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')

    const submitButton = page.locator('button[type="submit"]')

    // Cliquer et vérifier l'état de chargement
    await submitButton.click()

    // Le bouton devrait être désactivé pendant le chargement
    await expect(submitButton).toBeDisabled()
  })
})
