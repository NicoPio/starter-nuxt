import { chromium, type FullConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const authDir = path.join(__dirname, '.playwright/.auth')
  const authFile = path.join(authDir, 'user.json')

  // Créer le répertoire .playwright/.auth s'il n'existe pas
  fs.mkdirSync(authDir, { recursive: true })

  // Lancer un navigateur pour l'authentification
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  try {
    console.log('🔧 Création de l\'utilisateur de test via API...')

    // Créer un utilisateur de test via l'API
    try {
      const signupResponse = await context.request.post('/api/auth/register', {
        data: {
          email: 'test@example.com',
          password: 'testpassword123',
          name: 'Test Admin User',
        },
      })
      console.log('✓ Utilisateur créé')
    } catch (err) {
      console.log('ℹ Utilisateur existe déjà')
    }

    // Promouvoir spécifiquement l'utilisateur de test en Admin
    console.log('👑 Promotion de l\'utilisateur en Admin...')
    try {
      const promoteResponse = await context.request.post('/api/admin/promote-test-user', {
        data: {
          email: 'test@example.com',
        },
      })

      if (!promoteResponse.ok()) {
        const errorBody = await promoteResponse.text()
        throw new Error(`Échec promotion (${promoteResponse.status()}): ${errorBody}`)
      }

      const promoteResult = await promoteResponse.json()

      // Vérifier explicitement que le rôle est Admin
      if (promoteResult.user?.role !== 'Admin') {
        throw new Error(`Rôle attendu: Admin, reçu: ${promoteResult.user?.role || 'undefined'}`)
      }

      console.log(`✓  Utilisateur promu: ${promoteResult.user.email} → ${promoteResult.user.role}`)
    } catch (err) {
      console.error('❌ ERREUR CRITIQUE: Impossible de promouvoir l\'utilisateur de test')
      console.error('   Les tests nécessitant un compte Admin échoueront')
      console.error('   Erreur:', err)
      throw err // Re-throw pour arrêter le setup
    }

    // Se connecter pour créer une session
    const loginResponse = await context.request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword123',
      },
    })

    if (!loginResponse.ok()) {
      throw new Error(`Login failed: ${loginResponse.status()} ${await loginResponse.text()}`)
    }

    console.log('✓ Connecté avec succès')

    // Aller sur une page pour que les cookies soient définis
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Sauvegarder l'état d'authentification (cookies)
    await context.storageState({ path: authFile })
    console.log('✓ État d\'authentification sauvegardé')
  } catch (error) {
    console.error('❌ Erreur lors du setup d\'authentification:', error)
    // Ne pas échouer si le setup échoue (pour permettre les tests sans auth)
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup
