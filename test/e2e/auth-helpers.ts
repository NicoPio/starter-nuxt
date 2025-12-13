import type { Page } from '@playwright/test'

/**
 * Helpers pour l'authentification dans les tests E2E
 * Contourne les problèmes d'intégration UForm/Playwright en appelant directement les API
 */

export interface AuthCredentials {
  email: string
  password: string
  name?: string
}

/**
 * Se connecte via l'API et attend que la session soit établie
 */
export async function loginViaAPI(page: Page, credentials: AuthCredentials) {
  // Naviguer vers la page de login d'abord pour établir le contexte
  await page.goto('/login')

  // Appeler l'API de login via le contexte de la page
  const response = await page.evaluate(async (creds) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creds.email,
        password: creds.password,
      }),
    })
    return {
      ok: res.ok,
      status: res.status,
      body: await res.text(),
    }
  }, credentials)

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.body}`)
  }

  // Attendre un peu pour que la session soit établie
  await page.waitForTimeout(500)
}

/**
 * Crée un compte via l'API
 */
export async function signupViaAPI(page: Page, credentials: AuthCredentials) {
  // Naviguer vers la page de signup d'abord
  await page.goto('/signup')

  // Appeler l'API de signup via le contexte de la page
  const response = await page.evaluate(async (creds) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creds.email,
        password: creds.password,
        name: creds.name || creds.email.split('@')[0],
      }),
    })
    return {
      ok: res.ok,
      status: res.status,
      body: await res.text(),
    }
  }, credentials)

  if (!response.ok) {
    throw new Error(`Signup failed: ${response.status} ${response.body}`)
  }

  // Attendre un peu pour que la session soit établie
  await page.waitForTimeout(500)
}

/**
 * Se déconnecte via l'API
 */
export async function logoutViaAPI(page: Page) {
  // Appeler l'API de logout via le contexte de la page
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
    })
    return {
      ok: res.ok,
      status: res.status,
      body: await res.text(),
    }
  })

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.status} ${response.body}`)
  }

  // Attendre un peu pour que la session soit effacée
  await page.waitForTimeout(500)
}

/**
 * Vérifie si l'utilisateur est connecté en vérifiant la session
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/users/me')
      return res.ok
    })
    return response
  } catch {
    return false
  }
}

/**
 * Crée un utilisateur de test unique (pour éviter les conflits)
 */
export function createTestUser(prefix = 'test'): AuthCredentials {
  const timestamp = Date.now()
  return {
    email: `${prefix}-${timestamp}@example.com`,
    password: 'testpassword123',
    name: `Test User ${timestamp}`,
  }
}
