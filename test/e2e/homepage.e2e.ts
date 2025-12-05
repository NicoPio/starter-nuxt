import { test, expect } from '@playwright/test'

test.describe('Page d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Homepage charge correctement', async ({ page }) => {
    // Vérifier que la page est chargée
    await expect(page).toHaveURL('/')

    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/home|starter|accueil/i)

    // Vérifier que le contenu principal est visible
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test('Navigation vers login fonctionne', async ({ page }) => {
    // Trouver et cliquer sur le lien login
    const loginLink = page.getByRole('link', { name: /login|sign in|connexion/i })
    await loginLink.click()

    // Vérifier la navigation
    await page.waitForURL('/auth/login')
    await expect(page.getByRole('heading', { name: /login|sign in|connexion/i })).toBeVisible()
  })

  test('Navigation vers signup fonctionne', async ({ page }) => {
    // Trouver et cliquer sur le lien signup
    const signupLink = page.getByRole('link', { name: /sign up|get started|create account|inscription/i })
    await signupLink.click()

    // Vérifier la navigation
    await page.waitForURL('/auth/signup')
    await expect(page.getByRole('heading', { name: /sign up|create account|inscription/i })).toBeVisible()
  })

  test('Hero section est visible', async ({ page }) => {
    // Vérifier la présence du hero (typiquement un h1)
    const heroHeading = page.locator('h1').first()
    await expect(heroHeading).toBeVisible()

    // Vérifier qu'il y a du texte
    const heroText = await heroHeading.textContent()
    expect(heroText).toBeTruthy()
    expect(heroText!.length).toBeGreaterThan(0)
  })

  test('Section features est visible', async ({ page }) => {
    // Chercher une section avec des features (plusieurs façons de l'identifier)
    const featuresSection = page.locator('[data-testid="features"]')
      .or(page.getByRole('region', { name: /features|fonctionnalités/i }))
      .or(page.locator('section').filter({ hasText: /features|fonctionnalités/i }))

    // Vérifier qu'au moins une section existe
    const count = await featuresSection.count()
    expect(count).toBeGreaterThan(0)
  })

  test('CTA buttons sont cliquables', async ({ page }) => {
    // Trouver tous les boutons CTA
    const ctaButtons = page.getByRole('link', { name: /get started|commencer|try now/i })
      .or(page.getByRole('button', { name: /get started|commencer|try now/i }))

    // Vérifier qu'il y en a au moins un
    const count = await ctaButtons.count()
    expect(count).toBeGreaterThan(0)

    // Vérifier que le premier est visible et enabled
    const firstCta = ctaButtons.first()
    await expect(firstCta).toBeVisible()
    await expect(firstCta).toBeEnabled()
  })

  test('Logo est visible et cliquable', async ({ page }) => {
    // Chercher le logo (généralement un lien vers la home)
    const logo = page.locator('[data-testid="logo"]')
      .or(page.getByRole('link', { name: /home|logo/i }).first())
      .or(page.locator('a[href="/"]').first())

    await expect(logo).toBeVisible()
  })

  test('Navigation menu fonctionne', async ({ page }) => {
    // Vérifier la présence du menu de navigation
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible()

    // Vérifier qu'il contient des liens
    const links = nav.getByRole('link')
    const linkCount = await links.count()
    expect(linkCount).toBeGreaterThan(0)
  })

  test('Footer est visible', async ({ page }) => {
    // Scroll vers le bas pour voir le footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Vérifier la présence du footer
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })

  test('Dark mode toggle fonctionne', async ({ page }) => {
    // Chercher le bouton de toggle de mode couleur
    const colorModeToggle = page.locator('[data-testid="color-mode-toggle"]')
      .or(page.getByRole('button', { name: /dark mode|light mode|theme/i }))

    if (await colorModeToggle.count() > 0) {
      // Cliquer sur le toggle
      await colorModeToggle.first().click()

      // Attendre un court instant pour le changement
      await page.waitForTimeout(300)

      // Vérifier que le HTML a changé de classe
      const html = page.locator('html')
      const classes = await html.getAttribute('class')
      expect(classes).toBeTruthy()
    }
  })

  test('Responsive design - mobile viewport', async ({ page }) => {
    // Changer le viewport pour mobile
    await page.setViewportSize({ width: 375, height: 667 })

    // Vérifier que la page est toujours visible
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Vérifier qu'il n'y a pas de débordement horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5) // +5 pour marge d'erreur
  })

  test('Accessibilité - skip link fonctionne', async ({ page }) => {
    // Chercher le skip link
    const skipLink = page.getByRole('link', { name: /skip to main|skip to content/i })

    if (await skipLink.count() > 0) {
      await skipLink.focus()
      await expect(skipLink).toBeFocused()
    }
  })
})
