import { randomBytes, timingSafeEqual, scryptSync } from 'node:crypto'

/**
 * Configuration pour les tokens de réinitialisation
 */
export const TOKEN_CONFIG = {
  TOKEN_LENGTH_BYTES: 32, // 256 bits d'entropie
  TOKEN_EXPIRATION_MS: 60 * 60 * 1000, // 1 heure
  RATE_LIMIT_MS: 5 * 60 * 1000, // 5 minutes entre demandes
} as const

/**
 * Génère un token de réinitialisation de mot de passe sécurisé
 *
 * Utilise crypto.randomBytes pour générer 32 bytes (256 bits) d'entropie
 * cryptographiquement sécurisée, conformément aux recommandations OWASP.
 *
 * @returns Objet contenant le token en clair (à envoyer) et son hash (à stocker)
 *
 * @example
 * const { token, tokenHash } = generatePasswordResetToken()
 * // token: "K7gNU3sdo-OL0wNhqoVWhr3g6s1xYv72ol_pe_Unols" (43 caractères)
 * // tokenHash: "abc123salt:def456hash" (format salt:hash)
 */
export function generatePasswordResetToken(): { token: string; tokenHash: string } {
  // Génération de 32 bytes aléatoires cryptographiquement sécurisés (CSPRNG)
  const tokenBytes = randomBytes(TOKEN_CONFIG.TOKEN_LENGTH_BYTES)

  // Encodage Base64URL (URL-safe)
  // Remplace + → -, / → _, supprime =
  const token = tokenBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // Hash du token pour stockage sécurisé (ne jamais stocker en clair!)
  const tokenHash = hashToken(token)

  return { token, tokenHash }
}

/**
 * Hash un token avec scrypt (même algorithme que les mots de passe)
 *
 * Format de sortie : "salt:hash" (compatible avec le système d'authentification)
 *
 * @param token - Token en clair à hasher
 * @returns Hash au format "salt:hash"
 */
function hashToken(token: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(token, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Vérifie un token avec protection contre les attaques par timing
 *
 * Utilise timingSafeEqual() pour garantir un temps de réponse constant,
 * indépendamment du résultat de la comparaison (protection contre timing attacks).
 *
 * @param token - Token en clair à vérifier
 * @param tokenHash - Hash stocké au format "salt:hash"
 * @returns true si le token correspond, false sinon
 *
 * @example
 * const isValid = verifyPasswordResetToken(token, storedHash)
 * if (isValid) {
 *   // Token valide, procéder à la réinitialisation
 * }
 */
export function verifyPasswordResetToken(token: string, tokenHash: string): boolean {
  try {
    const [salt, hash] = tokenHash.split(':')
    if (!salt || !hash) return false

    const hashBuffer = Buffer.from(hash, 'hex')
    const verifyBuffer = scryptSync(token, salt, 64)

    // Vérification des longueurs avant timingSafeEqual
    if (hashBuffer.length !== verifyBuffer.length) return false

    // Comparaison avec protection contre timing attacks
    return timingSafeEqual(hashBuffer, verifyBuffer)
  } catch {
    // En cas d'erreur (token malformé, etc.), retourner false
    return false
  }
}

/**
 * Calcule la date d'expiration d'un token
 *
 * @returns Date d'expiration (maintenant + 1 heure)
 */
export function getTokenExpirationDate(): Date {
  return new Date(Date.now() + TOKEN_CONFIG.TOKEN_EXPIRATION_MS)
}

/**
 * Vérifie si un token a expiré
 *
 * @param expiresAt - Date d'expiration du token
 * @returns true si le token a expiré, false sinon
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt)
}
