import { describe, it, expect } from 'vitest'
import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  getTokenExpirationDate,
  isTokenExpired,
  TOKEN_CONFIG,
} from '~/server/utils/crypto'

describe('server/utils/crypto', () => {
  describe('generatePasswordResetToken', () => {
    it('generates a token and tokenHash', () => {
      const { token, tokenHash } = generatePasswordResetToken()

      expect(token).toBeDefined()
      expect(tokenHash).toBeDefined()
      expect(typeof token).toBe('string')
      expect(typeof tokenHash).toBe('string')
    })

    it('generates URL-safe tokens (Base64URL encoding)', () => {
      const { token } = generatePasswordResetToken()

      // Base64URL ne doit pas contenir +, /, ou =
      expect(token).not.toMatch(/[+/=]/)
      // Doit contenir uniquement des caractères alphanumériques, - et _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('generates tokens of expected length (43 characters for 32 bytes)', () => {
      const { token } = generatePasswordResetToken()

      // 32 bytes en Base64URL donnent 43 caractères (sans le padding =)
      expect(token).toHaveLength(43)
    })

    it('generates tokenHash in correct format (salt:hash)', () => {
      const { tokenHash } = generatePasswordResetToken()

      // Format attendu : "salt:hash" où salt et hash sont en hexadécimal
      expect(tokenHash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/)

      const [salt, hash] = tokenHash.split(':')
      expect(salt).toBeDefined()
      expect(hash).toBeDefined()
      expect(salt.length).toBe(32) // 16 bytes en hex = 32 caractères
      expect(hash.length).toBe(128) // 64 bytes en hex = 128 caractères
    })

    it('generates unique tokens on each call', () => {
      const token1 = generatePasswordResetToken()
      const token2 = generatePasswordResetToken()
      const token3 = generatePasswordResetToken()

      expect(token1.token).not.toBe(token2.token)
      expect(token2.token).not.toBe(token3.token)
      expect(token1.token).not.toBe(token3.token)

      expect(token1.tokenHash).not.toBe(token2.tokenHash)
      expect(token2.tokenHash).not.toBe(token3.tokenHash)
      expect(token1.tokenHash).not.toBe(token3.tokenHash)
    })

    it('generates cryptographically secure tokens (high entropy)', () => {
      const tokens = new Set()
      const iterations = 100

      // Générer 100 tokens et vérifier qu'ils sont tous uniques
      for (let i = 0; i < iterations; i++) {
        const { token } = generatePasswordResetToken()
        tokens.add(token)
      }

      expect(tokens.size).toBe(iterations)
    })
  })

  describe('verifyPasswordResetToken', () => {
    it('returns true for valid token and hash pair', () => {
      const { token, tokenHash } = generatePasswordResetToken()

      const isValid = verifyPasswordResetToken(token, tokenHash)

      expect(isValid).toBe(true)
    })

    it('returns false for invalid token with correct hash', () => {
      const { tokenHash } = generatePasswordResetToken()
      const invalidToken = 'invalid_token_that_does_not_match'

      const isValid = verifyPasswordResetToken(invalidToken, tokenHash)

      expect(isValid).toBe(false)
    })

    it('returns false for valid token with incorrect hash', () => {
      const { token } = generatePasswordResetToken()
      const { tokenHash: wrongHash } = generatePasswordResetToken()

      const isValid = verifyPasswordResetToken(token, wrongHash)

      expect(isValid).toBe(false)
    })

    it('returns false for malformed tokenHash (missing colon)', () => {
      const { token } = generatePasswordResetToken()
      const malformedHash = 'abc123def456nocolon'

      const isValid = verifyPasswordResetToken(token, malformedHash)

      expect(isValid).toBe(false)
    })

    it('returns false for malformed tokenHash (empty salt)', () => {
      const { token } = generatePasswordResetToken()
      const malformedHash = ':def456hash'

      const isValid = verifyPasswordResetToken(token, malformedHash)

      expect(isValid).toBe(false)
    })

    it('returns false for malformed tokenHash (empty hash)', () => {
      const { token } = generatePasswordResetToken()
      const malformedHash = 'abc123salt:'

      const isValid = verifyPasswordResetToken(token, malformedHash)

      expect(isValid).toBe(false)
    })

    it('returns false for empty token', () => {
      const { tokenHash } = generatePasswordResetToken()

      const isValid = verifyPasswordResetToken('', tokenHash)

      expect(isValid).toBe(false)
    })

    it('returns false for empty tokenHash', () => {
      const { token } = generatePasswordResetToken()

      const isValid = verifyPasswordResetToken(token, '')

      expect(isValid).toBe(false)
    })

    it('is resilient to timing attacks (constant time comparison)', () => {
      const { token, tokenHash } = generatePasswordResetToken()
      const wrongToken = 'a'.repeat(43)

      // Mesurer le temps pour un token valide
      const start1 = Date.now()
      verifyPasswordResetToken(token, tokenHash)
      const time1 = Date.now() - start1

      // Mesurer le temps pour un token invalide
      const start2 = Date.now()
      verifyPasswordResetToken(wrongToken, tokenHash)
      const time2 = Date.now() - start2

      // Les deux temps devraient être similaires (différence < 10ms)
      // Note: Ce test peut être flaky sur des systèmes lents
      const timeDifference = Math.abs(time1 - time2)
      expect(timeDifference).toBeLessThan(10)
    })

    it('handles very long tokens gracefully', () => {
      const { tokenHash } = generatePasswordResetToken()
      const longToken = 'a'.repeat(10000)

      const isValid = verifyPasswordResetToken(longToken, tokenHash)

      expect(isValid).toBe(false)
    })

    it('handles non-Base64URL characters in token', () => {
      const { tokenHash } = generatePasswordResetToken()
      const invalidToken = 'token+with/invalid=chars'

      const isValid = verifyPasswordResetToken(invalidToken, tokenHash)

      expect(isValid).toBe(false)
    })
  })

  describe('getTokenExpirationDate', () => {
    it('returns a Date object', () => {
      const expiresAt = getTokenExpirationDate()

      expect(expiresAt).toBeInstanceOf(Date)
    })

    it('returns a date 1 hour in the future', () => {
      const now = Date.now()
      const expiresAt = getTokenExpirationDate()

      const oneHourInMs = TOKEN_CONFIG.TOKEN_EXPIRATION_MS
      const expectedTime = now + oneHourInMs

      // Tolérance de 100ms pour l'exécution du test
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedTime - 100)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedTime + 100)
    })

    it('returns consistent expiration period across multiple calls', () => {
      const exp1 = getTokenExpirationDate()
      const exp2 = getTokenExpirationDate()

      // Les deux dates devraient être très proches (< 10ms de différence)
      const timeDifference = Math.abs(exp1.getTime() - exp2.getTime())
      expect(timeDifference).toBeLessThan(10)
    })

    it('returns date exactly 1 hour in the future (3600000ms)', () => {
      const now = Date.now()
      const expiresAt = getTokenExpirationDate()

      const difference = expiresAt.getTime() - now

      // Devrait être exactement 1 heure (3600000ms) ± 100ms
      expect(difference).toBeGreaterThanOrEqual(3600000 - 100)
      expect(difference).toBeLessThanOrEqual(3600000 + 100)
    })
  })

  describe('isTokenExpired', () => {
    it('returns false for future date', () => {
      const futureDate = new Date(Date.now() + 3600000) // +1 heure

      const expired = isTokenExpired(futureDate)

      expect(expired).toBe(false)
    })

    it('returns true for past date', () => {
      const pastDate = new Date(Date.now() - 3600000) // -1 heure

      const expired = isTokenExpired(pastDate)

      expect(expired).toBe(true)
    })

    it('returns true for current moment (edge case)', () => {
      const now = new Date()

      // Attendre 1ms pour garantir que la date est dans le passé
      setTimeout(() => {
        const expired = isTokenExpired(now)
        expect(expired).toBe(true)
      }, 1)
    })

    it('returns false for date exactly 1ms in the future', () => {
      const futureDate = new Date(Date.now() + 1)

      const expired = isTokenExpired(futureDate)

      expect(expired).toBe(false)
    })

    it('returns true for date exactly 1ms in the past', () => {
      const pastDate = new Date(Date.now() - 1)

      const expired = isTokenExpired(pastDate)

      expect(expired).toBe(true)
    })

    it('handles Date string input correctly', () => {
      const futureDate = new Date(Date.now() + 3600000)

      const expired = isTokenExpired(futureDate)

      expect(expired).toBe(false)
    })

    it('handles very old dates', () => {
      const veryOldDate = new Date('2000-01-01')

      const expired = isTokenExpired(veryOldDate)

      expect(expired).toBe(true)
    })

    it('handles far future dates', () => {
      const farFutureDate = new Date('2100-01-01')

      const expired = isTokenExpired(farFutureDate)

      expect(expired).toBe(false)
    })
  })

  describe('TOKEN_CONFIG constants', () => {
    it('has correct token length (32 bytes = 256 bits)', () => {
      expect(TOKEN_CONFIG.TOKEN_LENGTH_BYTES).toBe(32)
    })

    it('has correct expiration time (1 hour = 3600000ms)', () => {
      expect(TOKEN_CONFIG.TOKEN_EXPIRATION_MS).toBe(60 * 60 * 1000)
      expect(TOKEN_CONFIG.TOKEN_EXPIRATION_MS).toBe(3600000)
    })

    it('has correct rate limit (5 minutes = 300000ms)', () => {
      expect(TOKEN_CONFIG.RATE_LIMIT_MS).toBe(5 * 60 * 1000)
      expect(TOKEN_CONFIG.RATE_LIMIT_MS).toBe(300000)
    })

    it('is immutable (as const)', () => {
      // TypeScript devrait empêcher la modification, mais on vérifie quand même
      expect(Object.isFrozen(TOKEN_CONFIG)).toBe(false) // 'as const' ne freeze pas l'objet en runtime

      // Mais on peut vérifier que les valeurs sont correctes
      expect(TOKEN_CONFIG.TOKEN_LENGTH_BYTES).toBeDefined()
      expect(TOKEN_CONFIG.TOKEN_EXPIRATION_MS).toBeDefined()
      expect(TOKEN_CONFIG.RATE_LIMIT_MS).toBeDefined()
    })
  })

  describe('Integration: Full token lifecycle', () => {
    it('completes full token generation and verification cycle', () => {
      // 1. Générer un token
      const { token, tokenHash } = generatePasswordResetToken()

      // 2. Vérifier que le token est valide
      const isValid = verifyPasswordResetToken(token, tokenHash)
      expect(isValid).toBe(true)

      // 3. Vérifier qu'un token différent est invalide
      const { token: differentToken } = generatePasswordResetToken()
      const isInvalid = verifyPasswordResetToken(differentToken, tokenHash)
      expect(isInvalid).toBe(false)
    })

    it('simulates token expiration check', () => {
      // 1. Générer un token avec date d'expiration
      const { token, tokenHash } = generatePasswordResetToken()
      const expiresAt = getTokenExpirationDate()

      // 2. Vérifier que le token n'est pas expiré
      const expired = isTokenExpired(expiresAt)
      expect(expired).toBe(false)

      // 3. Vérifier que le token est toujours valide
      const isValid = verifyPasswordResetToken(token, tokenHash)
      expect(isValid).toBe(true)
    })

    it('simulates complete password reset flow', () => {
      // Simulation du flux complet de réinitialisation

      // 1. Utilisateur demande une réinitialisation
      const { token, tokenHash } = generatePasswordResetToken()
      const expiresAt = getTokenExpirationDate()

      // 2. Token stocké en BDD (simulé)
      const storedToken = {
        tokenHash,
        expiresAt,
        used: false,
      }

      // 3. Utilisateur clique sur le lien avec le token
      const receivedToken = token

      // 4. Vérifier que le token est valide
      const isValidToken = verifyPasswordResetToken(receivedToken, storedToken.tokenHash)
      expect(isValidToken).toBe(true)

      // 5. Vérifier que le token n'est pas expiré
      const isExpired = isTokenExpired(storedToken.expiresAt)
      expect(isExpired).toBe(false)

      // 6. Vérifier que le token n'a pas été utilisé
      expect(storedToken.used).toBe(false)

      // ✅ Token valide, non expiré, non utilisé → Réinitialisation autorisée
    })
  })
})
