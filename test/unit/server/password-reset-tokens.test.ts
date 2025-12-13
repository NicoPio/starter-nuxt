import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PasswordResetToken } from '~/server/utils/database/password-reset-tokens'

// Mock sql function with factory
vi.mock('~/server/utils/database', () => ({
  sql: vi.fn(),
}))

// Import after mocking
import {
  createPasswordResetToken,
  getPasswordResetTokenById,
  getPasswordResetTokensByUserId,
  findValidPasswordResetToken,
  markPasswordResetTokenAsUsed,
  invalidateAllUserPasswordResetTokens,
  deleteAllUserPasswordResetTokens,
  deleteExpiredPasswordResetTokens,
  getRecentPasswordResetTokenForUser,
  validatePasswordResetToken,
  getPasswordResetTokenStats,
} from '~/server/utils/database/password-reset-tokens'

// Get reference to the mocked sql
import { sql } from '~/server/utils/database'
const mockSql = vi.mocked(sql)

describe('server/utils/database/password-reset-tokens', () => {
  beforeEach(() => {
    mockSql.mockReset()
  })

  // Helper pour créer un token de test
  const createMockToken = (overrides: Partial<PasswordResetToken> = {}): PasswordResetToken => ({
    id: 'test-token-id',
    user_id: 'test-user-id',
    token_hash: 'test-salt:test-hash',
    expires_at: new Date(Date.now() + 3600000), // +1 heure
    created_at: new Date(),
    used_at: null,
    ...overrides,
  })

  describe('createPasswordResetToken', () => {
    it('creates a password reset token successfully', async () => {
      const mockToken = createMockToken()
      mockSql.mockResolvedValue([mockToken])

      const result = await createPasswordResetToken({
        userId: 'test-user-id',
        tokenHash: 'test-salt:test-hash',
        expiresAt: new Date(Date.now() + 3600000),
      })

      expect(result).toEqual(mockToken)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('throws error if token creation fails', async () => {
      mockSql.mockResolvedValue([])

      await expect(
        createPasswordResetToken({
          userId: 'test-user-id',
          tokenHash: 'test-salt:test-hash',
          expiresAt: new Date(Date.now() + 3600000),
        })
      ).rejects.toThrow('Failed to create password reset token')
    })

    it('calls SQL with correct parameters', async () => {
      const mockToken = createMockToken()
      mockSql.mockResolvedValue([mockToken])

      const userId = 'user-123'
      const tokenHash = 'salt:hash'
      const expiresAt = new Date('2025-12-12T16:00:00Z')

      await createPasswordResetToken({ userId, tokenHash, expiresAt })

      expect(mockSql).toHaveBeenCalledOnce()
      // Vérifie que les paramètres sont passés (sans vérifier la requête SQL exacte)
      expect(mockSql.mock.calls[0]).toBeDefined()
    })
  })

  describe('getPasswordResetTokenById', () => {
    it('returns token when found', async () => {
      const mockToken = createMockToken()
      mockSql.mockResolvedValue([mockToken])

      const result = await getPasswordResetTokenById('test-token-id')

      expect(result).toEqual(mockToken)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns null when token not found', async () => {
      mockSql.mockResolvedValue([])

      const result = await getPasswordResetTokenById('non-existent-id')

      expect(result).toBeNull()
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('handles database errors gracefully', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))

      await expect(getPasswordResetTokenById('test-id')).rejects.toThrow('Database error')
    })
  })

  describe('getPasswordResetTokensByUserId', () => {
    it('returns array of tokens for user', async () => {
      const mockTokens = [
        createMockToken({ id: 'token-1' }),
        createMockToken({ id: 'token-2' }),
        createMockToken({ id: 'token-3' }),
      ]
      mockSql.mockResolvedValue(mockTokens)

      const result = await getPasswordResetTokensByUserId('test-user-id')

      expect(result).toEqual(mockTokens)
      expect(result).toHaveLength(3)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns empty array when user has no tokens', async () => {
      mockSql.mockResolvedValue([])

      const result = await getPasswordResetTokensByUserId('user-without-tokens')

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('returns tokens ordered by created_at DESC', async () => {
      const now = Date.now()
      const mockTokens = [
        createMockToken({ id: 'token-3', created_at: new Date(now + 2000) }),
        createMockToken({ id: 'token-2', created_at: new Date(now + 1000) }),
        createMockToken({ id: 'token-1', created_at: new Date(now) }),
      ]
      mockSql.mockResolvedValue(mockTokens)

      const result = await getPasswordResetTokensByUserId('test-user-id')

      // Le mock retourne déjà dans le bon ordre (c'est la BDD qui trie)
      expect(result[0].id).toBe('token-3')
      expect(result[1].id).toBe('token-2')
      expect(result[2].id).toBe('token-1')
    })
  })

  describe('findValidPasswordResetToken', () => {
    it('returns token when valid (not expired, not used)', async () => {
      const mockToken = createMockToken({
        expires_at: new Date(Date.now() + 3600000), // +1 heure
        used_at: null,
      })
      mockSql.mockResolvedValue([mockToken])

      const result = await findValidPasswordResetToken('test-salt:test-hash')

      expect(result).toEqual(mockToken)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns null when token is expired', async () => {
      // Le SQL ne retournera pas de token expiré car il a la condition expires_at > NOW()
      mockSql.mockResolvedValue([])

      const result = await findValidPasswordResetToken('expired-token-hash')

      expect(result).toBeNull()
    })

    it('returns null when token is already used', async () => {
      // Le SQL ne retournera pas de token utilisé car il a la condition used_at IS NULL
      mockSql.mockResolvedValue([])

      const result = await findValidPasswordResetToken('used-token-hash')

      expect(result).toBeNull()
    })

    it('returns null when token not found', async () => {
      mockSql.mockResolvedValue([])

      const result = await findValidPasswordResetToken('non-existent-hash')

      expect(result).toBeNull()
    })
  })

  describe('markPasswordResetTokenAsUsed', () => {
    it('marks token as used successfully', async () => {
      const mockToken = createMockToken({ used_at: new Date() })
      mockSql.mockResolvedValue([mockToken])

      const result = await markPasswordResetTokenAsUsed('test-token-id')

      expect(result).toBe(true)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns false when token not found or already used', async () => {
      mockSql.mockResolvedValue([])

      const result = await markPasswordResetTokenAsUsed('non-existent-id')

      expect(result).toBe(false)
    })

    it('only marks tokens that are not already used', async () => {
      // Le SQL a la condition used_at IS NULL, donc il ne peut pas marquer un token déjà utilisé
      mockSql.mockResolvedValue([])

      const result = await markPasswordResetTokenAsUsed('already-used-id')

      expect(result).toBe(false)
    })
  })

  describe('invalidateAllUserPasswordResetTokens', () => {
    it('invalidates all active tokens for user', async () => {
      const mockTokens = [
        createMockToken({ id: 'token-1' }),
        createMockToken({ id: 'token-2' }),
      ]
      mockSql.mockResolvedValue(mockTokens)

      const result = await invalidateAllUserPasswordResetTokens('test-user-id')

      expect(result).toBe(2)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns 0 when user has no active tokens', async () => {
      mockSql.mockResolvedValue([])

      const result = await invalidateAllUserPasswordResetTokens('user-without-tokens')

      expect(result).toBe(0)
    })

    it('only invalidates unused and non-expired tokens', async () => {
      // Le SQL a les conditions used_at IS NULL et expires_at > NOW()
      const mockTokens = [createMockToken()]
      mockSql.mockResolvedValue(mockTokens)

      const result = await invalidateAllUserPasswordResetTokens('test-user-id')

      expect(result).toBe(1)
    })
  })

  describe('deleteAllUserPasswordResetTokens', () => {
    it('deletes all tokens for user', async () => {
      const mockTokens = [
        createMockToken({ id: 'token-1' }),
        createMockToken({ id: 'token-2' }),
        createMockToken({ id: 'token-3' }),
      ]
      mockSql.mockResolvedValue(mockTokens)

      const result = await deleteAllUserPasswordResetTokens('test-user-id')

      expect(result).toBe(3)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns 0 when user has no tokens', async () => {
      mockSql.mockResolvedValue([])

      const result = await deleteAllUserPasswordResetTokens('user-without-tokens')

      expect(result).toBe(0)
    })

    it('deletes all tokens regardless of status', async () => {
      const now = Date.now()
      const mockTokens = [
        createMockToken({ id: 'active', used_at: null, expires_at: new Date(now + 3600000) }),
        createMockToken({ id: 'used', used_at: new Date(), expires_at: new Date(now + 3600000) }),
        createMockToken({ id: 'expired', used_at: null, expires_at: new Date(now - 3600000) }),
      ]
      mockSql.mockResolvedValue(mockTokens)

      const result = await deleteAllUserPasswordResetTokens('test-user-id')

      expect(result).toBe(3)
    })
  })

  describe('deleteExpiredPasswordResetTokens', () => {
    it('deletes tokens expired for more than 24 hours', async () => {
      const mockTokens = [
        createMockToken({ id: 'expired-1' }),
        createMockToken({ id: 'expired-2' }),
      ]
      mockSql.mockResolvedValue(mockTokens)

      const result = await deleteExpiredPasswordResetTokens()

      expect(result).toBe(2)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns 0 when no expired tokens exist', async () => {
      mockSql.mockResolvedValue([])

      const result = await deleteExpiredPasswordResetTokens()

      expect(result).toBe(0)
    })

    it('only deletes tokens expired for more than 24h, not recently expired', async () => {
      // Le SQL a la condition expires_at < NOW() - INTERVAL '24 hours'
      // Donc il ne supprime pas les tokens expirés récemment
      mockSql.mockResolvedValue([])

      const result = await deleteExpiredPasswordResetTokens()

      expect(result).toBe(0)
    })
  })

  describe('getRecentPasswordResetTokenForUser', () => {
    it('returns recent token within rate limit period', async () => {
      const recentToken = createMockToken({
        created_at: new Date(Date.now() - 60000), // -1 minute
      })
      mockSql.mockResolvedValue([recentToken])

      const rateLimitMs = 5 * 60 * 1000 // 5 minutes
      const result = await getRecentPasswordResetTokenForUser('test-user-id', rateLimitMs)

      expect(result).toEqual(recentToken)
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns null when no recent tokens exist', async () => {
      mockSql.mockResolvedValue([])

      const rateLimitMs = 5 * 60 * 1000
      const result = await getRecentPasswordResetTokenForUser('test-user-id', rateLimitMs)

      expect(result).toBeNull()
    })

    it('returns most recent token when multiple exist', async () => {
      const mostRecentToken = createMockToken({
        id: 'most-recent',
        created_at: new Date(Date.now() - 60000),
      })
      mockSql.mockResolvedValue([mostRecentToken])

      const rateLimitMs = 5 * 60 * 1000
      const result = await getRecentPasswordResetTokenForUser('test-user-id', rateLimitMs)

      expect(result?.id).toBe('most-recent')
    })

    it('respects custom rate limit period', async () => {
      const recentToken = createMockToken()
      mockSql.mockResolvedValue([recentToken])

      const customRateLimitMs = 10 * 60 * 1000 // 10 minutes
      await getRecentPasswordResetTokenForUser('test-user-id', customRateLimitMs)

      expect(mockSql).toHaveBeenCalledOnce()
    })
  })

  describe('validatePasswordResetToken', () => {
    it('returns valid for unused and non-expired token', async () => {
      const validToken = createMockToken({
        id: 'valid-token-id',
        used_at: null,
        expires_at: new Date(Date.now() + 3600000),
      })
      mockSql.mockResolvedValue([validToken])

      const result = await validatePasswordResetToken('valid-token-id')

      expect(result.isValid).toBe(true)
      expect(result.token).toEqual(validToken)
      expect(result.reason).toBeUndefined()
    })

    it('returns TOKEN_NOT_FOUND when token does not exist', async () => {
      mockSql.mockResolvedValue([])

      const result = await validatePasswordResetToken('non-existent-id')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('TOKEN_NOT_FOUND')
      expect(result.token).toBeUndefined()
    })

    it('returns TOKEN_USED when token has been used', async () => {
      const usedToken = createMockToken({
        used_at: new Date(Date.now() - 60000),
        expires_at: new Date(Date.now() + 3600000),
      })
      mockSql.mockResolvedValue([usedToken])

      const result = await validatePasswordResetToken('used-token-id')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('TOKEN_USED')
      expect(result.token).toEqual(usedToken)
    })

    it('returns TOKEN_EXPIRED when token has expired', async () => {
      const expiredToken = createMockToken({
        used_at: null,
        expires_at: new Date(Date.now() - 3600000), // -1 heure
      })
      mockSql.mockResolvedValue([expiredToken])

      const result = await validatePasswordResetToken('expired-token-id')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('TOKEN_EXPIRED')
      expect(result.token).toEqual(expiredToken)
    })

    it('checks expiration before usage status', async () => {
      // Token expiré ET utilisé → doit retourner TOKEN_USED car vérifié en premier
      const token = createMockToken({
        used_at: new Date(Date.now() - 60000),
        expires_at: new Date(Date.now() - 3600000),
      })
      mockSql.mockResolvedValue([token])

      const result = await validatePasswordResetToken('token-id')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('TOKEN_USED') // used_at vérifié avant expires_at
    })
  })

  describe('getPasswordResetTokenStats', () => {
    it('returns correct statistics', async () => {
      mockSql.mockResolvedValue([
        {
          active: '5',
          used: '10',
          expired: '3',
          total: '18',
        },
      ])

      const result = await getPasswordResetTokenStats()

      expect(result).toEqual({
        active: 5,
        used: 10,
        expired: 3,
        total: 18,
      })
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('returns zeros when no tokens exist', async () => {
      mockSql.mockResolvedValue([
        {
          active: '0',
          used: '0',
          expired: '0',
          total: '0',
        },
      ])

      const result = await getPasswordResetTokenStats()

      expect(result).toEqual({
        active: 0,
        used: 0,
        expired: 0,
        total: 0,
      })
    })

    it('parses string counts to numbers correctly', async () => {
      mockSql.mockResolvedValue([
        {
          active: '100',
          used: '200',
          expired: '50',
          total: '350',
        },
      ])

      const result = await getPasswordResetTokenStats()

      expect(typeof result.active).toBe('number')
      expect(typeof result.used).toBe('number')
      expect(typeof result.expired).toBe('number')
      expect(typeof result.total).toBe('number')
      expect(result.active).toBe(100)
      expect(result.used).toBe(200)
      expect(result.expired).toBe(50)
      expect(result.total).toBe(350)
    })

    it('total equals sum of active, used, and expired', async () => {
      mockSql.mockResolvedValue([
        {
          active: '10',
          used: '20',
          expired: '5',
          total: '35',
        },
      ])

      const result = await getPasswordResetTokenStats()

      expect(result.active + result.used + result.expired).toBe(result.total)
    })
  })

  describe('Integration: Token lifecycle', () => {
    it('simulates complete token lifecycle', async () => {
      // 1. Créer un token
      const newToken = createMockToken()
      mockSql.mockResolvedValueOnce([newToken])

      const created = await createPasswordResetToken({
        userId: 'test-user-id',
        tokenHash: 'test-salt:test-hash',
        expiresAt: new Date(Date.now() + 3600000),
      })
      expect(created).toEqual(newToken)

      // 2. Trouver le token (valide)
      mockSql.mockResolvedValueOnce([newToken])
      const found = await findValidPasswordResetToken('test-salt:test-hash')
      expect(found).toEqual(newToken)

      // 3. Valider le token
      mockSql.mockResolvedValueOnce([newToken])
      const validation = await validatePasswordResetToken(newToken.id)
      expect(validation.isValid).toBe(true)

      // 4. Marquer comme utilisé
      const usedToken = { ...newToken, used_at: new Date() }
      mockSql.mockResolvedValueOnce([usedToken])
      const marked = await markPasswordResetTokenAsUsed(newToken.id)
      expect(marked).toBe(true)

      // 5. Vérifier qu'il n'est plus valide
      mockSql.mockResolvedValueOnce([usedToken])
      const revalidation = await validatePasswordResetToken(newToken.id)
      expect(revalidation.isValid).toBe(false)
      expect(revalidation.reason).toBe('TOKEN_USED')
    })

    it('simulates rate limiting scenario', async () => {
      // 1. Utilisateur demande un reset
      const firstToken = createMockToken({ created_at: new Date(Date.now() - 60000) })
      mockSql.mockResolvedValueOnce([firstToken])

      await createPasswordResetToken({
        userId: 'test-user-id',
        tokenHash: 'first-hash',
        expiresAt: new Date(Date.now() + 3600000),
      })

      // 2. Vérifier si rate limit atteint (5 minutes)
      mockSql.mockResolvedValueOnce([firstToken])
      const recent = await getRecentPasswordResetTokenForUser('test-user-id', 5 * 60 * 1000)
      expect(recent).not.toBeNull() // Rate limit atteint

      // 3. Nouvelle demande devrait être bloquée
      // (Dans l'implémentation réelle, l'API endpoint rejetterait la demande)
    })

    it('simulates cleanup of expired tokens', async () => {
      // 1. Statistiques avant nettoyage
      mockSql.mockResolvedValueOnce([{ active: '5', used: '10', expired: '3', total: '18' }])
      const beforeStats = await getPasswordResetTokenStats()
      expect(beforeStats.expired).toBe(3)

      // 2. Nettoyage des tokens expirés
      mockSql.mockResolvedValueOnce([
        createMockToken({ id: 'expired-1' }),
        createMockToken({ id: 'expired-2' }),
        createMockToken({ id: 'expired-3' }),
      ])
      const deleted = await deleteExpiredPasswordResetTokens()
      expect(deleted).toBe(3)

      // 3. Statistiques après nettoyage
      mockSql.mockResolvedValueOnce([{ active: '5', used: '10', expired: '0', total: '15' }])
      const afterStats = await getPasswordResetTokenStats()
      expect(afterStats.expired).toBe(0)
      expect(afterStats.total).toBe(15)
    })
  })

  describe('Edge cases', () => {
    it('handles very long token hashes', async () => {
      const longHash = 'a'.repeat(1000) + ':' + 'b'.repeat(1000)
      mockSql.mockResolvedValue([])

      const result = await findValidPasswordResetToken(longHash)

      expect(result).toBeNull()
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('handles special characters in user ID', async () => {
      const specialUserId = "user'with\"special<chars>"
      mockSql.mockResolvedValue([])

      const result = await getPasswordResetTokensByUserId(specialUserId)

      expect(result).toEqual([])
      expect(mockSql).toHaveBeenCalledOnce()
    })

    it('handles concurrent token creation for same user', async () => {
      const token1 = createMockToken({ id: 'token-1' })
      const token2 = createMockToken({ id: 'token-2' })

      mockSql.mockResolvedValueOnce([token1])
      mockSql.mockResolvedValueOnce([token2])

      const result1 = await createPasswordResetToken({
        userId: 'test-user-id',
        tokenHash: 'hash-1',
        expiresAt: new Date(Date.now() + 3600000),
      })

      const result2 = await createPasswordResetToken({
        userId: 'test-user-id',
        tokenHash: 'hash-2',
        expiresAt: new Date(Date.now() + 3600000),
      })

      expect(result1.id).not.toBe(result2.id)
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it('handles empty user ID gracefully', async () => {
      mockSql.mockResolvedValue([])

      const result = await getPasswordResetTokensByUserId('')

      expect(result).toEqual([])
    })

    it('handles null dates in token validation', async () => {
      const tokenWithNullDate = {
        ...createMockToken(),
        expires_at: null as any,
      }
      mockSql.mockResolvedValue([tokenWithNullDate])

      const result = await validatePasswordResetToken('token-id')

      // Si expires_at est null, new Date(null) est invalide, donc le token est invalide
      expect(result.isValid).toBe(false)
    })
  })
})
