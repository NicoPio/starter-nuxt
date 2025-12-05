import { chromium, type FullConfig } from '@playwright/test'
import path from 'node:path'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const authFile = path.join(__dirname, '.playwright/.auth/user.json')

  // Lancer un navigateur pour l'authentification
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Se connecter avec un utilisateur de test
    await page.goto(`${baseURL}/auth/login`)

    // Remplir le formulaire de login
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')

    // Soumettre le formulaire
    await page.click('button[type="submit"]')

    // Attendre la redirection vers le dashboard
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 })

    // Sauvegarder l'état d'authentification
    await page.context().storageState({ path: authFile })

    console.log('✓ État d\'authentification sauvegardé')
  } catch (error) {
    console.error('Erreur lors du setup d\'authentification:', error)
    // Ne pas échouer si le setup échoue (pour permettre les tests sans auth)
  } finally {
    await browser.close()
  }
}

export default globalSetup
