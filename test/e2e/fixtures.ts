import { test as base } from '@playwright/test'
import path from 'node:path'

type AuthFixtures = {
  authenticatedPage: any
}

// Étendre le test avec une fixture pour les pages authentifiées
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '.playwright/.auth/user.json')

    // Créer un contexte avec l'état d'authentification
    const context = await browser.newContext({
      storageState: authFile,
    })

    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
