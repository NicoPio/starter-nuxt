import type { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  // Nettoyer les ressources si nécessaire
  // Pour l'instant, aucun nettoyage requis
  console.log('✓ Tests E2E terminés')
}

export default globalTeardown
