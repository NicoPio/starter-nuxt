/**
 * Promote Test User to Admin Role (E2E Testing Only)
 *
 * Cette route API est EXCLUSIVEMENT destinée aux tests E2E Playwright.
 * Elle est automatiquement désactivée en production via plusieurs vérifications.
 *
 * @security
 * - ❌ Désactivée en production (NODE_ENV + ENABLE_TEST_ROUTES checks)
 * - ❌ Aucune authentification requise (route de test uniquement)
 * - ⚠️  Peut promouvoir n'importe quel utilisateur (utiliser uniquement en test)
 *
 * @route POST /api/admin/promote-test-user
 * @body { email: string } - Email de l'utilisateur à promouvoir
 * @returns { message: string, user: Pick<User, 'id' | 'name' | 'email' | 'role'> }
 *
 * @throws {403} Si utilisé en production ou si les routes de test sont désactivées
 * @throws {404} Si l'utilisateur n'existe pas
 * @throws {400} Si l'email est invalide (Zod validation)
 *
 * @example
 * // Dans global-setup.ts de Playwright
 * const response = await context.request.post('/api/admin/promote-test-user', {
 *   data: { email: 'test@example.com' },
 * })
 */

import { sql } from '../../utils/database'
import type { User } from '../../utils/database/users'
import { z } from 'zod'

const promoteTestUserSchema = z.object({
  email: z.string().email(),
})

export default defineEventHandler(async (event) => {
  // Couche 1: Vérifier l'environnement avec valeur par défaut sécurisée
  const nodeEnv = process.env.NODE_ENV || 'production'
  if (nodeEnv === 'production') {
    throw createError({
      statusCode: 403,
      message: 'Cette route est désactivée en production',
    })
  }

  // Couche 2: Vérifier un flag de test explicite
  if (process.env.ENABLE_TEST_ROUTES !== 'true') {
    throw createError({
      statusCode: 403,
      message: 'Routes de test désactivées. Définir ENABLE_TEST_ROUTES=true pour les activer.',
    })
  }

  // Couche 3: Vérification supplémentaire pour environnements de test connus
  const isTestEnvironment =
    process.env.CI === 'true' ||
    process.env.VITEST === 'true' ||
    process.env.PLAYWRIGHT === 'true'

  if (!isTestEnvironment && nodeEnv !== 'test') {
    throw createError({
      statusCode: 403,
      message: 'Cette route est réservée aux environnements de test',
    })
  }

  // Validation de l'entrée
  const body = await readBody(event)
  const { email } = promoteTestUserSchema.parse(body)

  // Promouvoir l'utilisateur spécifique en Admin avec postgres.js (protection SQL injection)
  const updateResult = await sql<Pick<User, 'id' | 'name' | 'email' | 'role'>[]>`
    UPDATE users
    SET role = 'Admin', updated_at = NOW()
    WHERE email = ${email}
    RETURNING id, name, email, role
  `

  if (updateResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Opération échouée',
    })
  }

  return {
    message: 'Utilisateur promu Admin avec succès',
    user: updateResult[0],
  }
})
