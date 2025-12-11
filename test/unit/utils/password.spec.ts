import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashPasswordCustom, verifyPasswordCustom, rehashIfNeeded } from '~/server/utils/password'
import bcrypt from 'bcrypt'

describe('Password Utilities', () => {
  describe('hashPasswordCustom', () => {
    it('génère un hash au format scrypt avec salt:hash', async () => {
      const password = 'test-password-123'
      const hash = await hashPasswordCustom(password)

      // Format: salt:hash (deux parties séparées par :)
      expect(hash).toContain(':')
      const parts = hash.split(':')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toHaveLength(32) // Salt en hex (16 bytes = 32 chars)
      expect(parts[1]).toHaveLength(128) // Hash en hex (64 bytes = 128 chars)
    })

    it('génère des hashes différents pour le même mot de passe (salts aléatoires)', async () => {
      const password = 'same-password'
      const hash1 = await hashPasswordCustom(password)
      const hash2 = await hashPasswordCustom(password)

      expect(hash1).not.toBe(hash2)
    })

    it('génère un hash valide pour un mot de passe vide', async () => {
      const hash = await hashPasswordCustom('')
      expect(hash).toContain(':')
      expect(hash.split(':')).toHaveLength(2)
    })

    it('génère un hash valide pour un mot de passe long', async () => {
      const longPassword = 'a'.repeat(100)
      const hash = await hashPasswordCustom(longPassword)
      expect(hash).toContain(':')
      expect(hash.split(':')).toHaveLength(2)
    })
  })

  describe('verifyPasswordCustom', () => {
    describe('avec hash scrypt', () => {
      it('vérifie correctement un mot de passe valide', async () => {
        const password = 'valid-password-123'
        const hash = await hashPasswordCustom(password)
        const isValid = await verifyPasswordCustom(password, hash)

        expect(isValid).toBe(true)
      })

      it('rejette un mot de passe incorrect', async () => {
        const correctPassword = 'correct-password'
        const wrongPassword = 'wrong-password'
        const hash = await hashPasswordCustom(correctPassword)
        const isValid = await verifyPasswordCustom(wrongPassword, hash)

        expect(isValid).toBe(false)
      })

      it('est sensible à la casse', async () => {
        const password = 'CaseSensitive'
        const hash = await hashPasswordCustom(password)

        expect(await verifyPasswordCustom('CaseSensitive', hash)).toBe(true)
        expect(await verifyPasswordCustom('casesensitive', hash)).toBe(false)
        expect(await verifyPasswordCustom('CASESENSITIVE', hash)).toBe(false)
      })

      it('rejette un hash scrypt mal formaté', async () => {
        const password = 'test-password'
        const malformedHash = 'invalid:format:too:many:parts'

        const isValid = await verifyPasswordCustom(password, malformedHash)
        expect(isValid).toBe(false)
      })

      it('rejette un hash scrypt avec un mauvais salt', async () => {
        const password = 'test-password'
        const hash = await hashPasswordCustom(password)
        const [, hashPart] = hash.split(':')
        const badHash = `badsalt:${hashPart}`

        const isValid = await verifyPasswordCustom(password, badHash)
        expect(isValid).toBe(false)
      })
    })

    describe('avec hash bcrypt (legacy Better Auth)', () => {
      it('vérifie correctement un hash bcrypt $2a$', async () => {
        const password = 'legacy-password'
        const bcryptHash = await bcrypt.hash(password, 10)

        expect(bcryptHash).toMatch(/^\$2[ab]\$/)
        const isValid = await verifyPasswordCustom(password, bcryptHash)
        expect(isValid).toBe(true)
      })

      it('vérifie correctement un hash bcrypt $2b$', async () => {
        const password = 'legacy-password'
        // bcrypt génère des hashes $2b$ par défaut dans les versions récentes
        const bcryptHash = await bcrypt.hash(password, 10)

        const isValid = await verifyPasswordCustom(password, bcryptHash)
        expect(isValid).toBe(true)
      })

      it('rejette un mot de passe incorrect avec hash bcrypt', async () => {
        const correctPassword = 'correct-password'
        const wrongPassword = 'wrong-password'
        const bcryptHash = await bcrypt.hash(correctPassword, 10)

        const isValid = await verifyPasswordCustom(wrongPassword, bcryptHash)
        expect(isValid).toBe(false)
      })

      it('est sensible à la casse avec bcrypt', async () => {
        const password = 'CaseSensitive'
        const bcryptHash = await bcrypt.hash(password, 10)

        expect(await verifyPasswordCustom('CaseSensitive', bcryptHash)).toBe(true)
        expect(await verifyPasswordCustom('casesensitive', bcryptHash)).toBe(false)
      })
    })

    describe('détection de format de hash', () => {
      it('retourne false pour un hash au format inconnu', async () => {
        const password = 'test-password'
        const unknownHash = 'unknown-format-without-colon-or-bcrypt-prefix'

        const isValid = await verifyPasswordCustom(password, unknownHash)
        expect(isValid).toBe(false)
      })

      it('retourne false pour une chaîne vide', async () => {
        const password = 'test-password'
        const isValid = await verifyPasswordCustom(password, '')

        expect(isValid).toBe(false)
      })
    })
  })

  describe('rehashIfNeeded', () => {
    beforeEach(() => {
      // Mock de updateUserPassword pour éviter les appels réels à la base de données
      vi.mock('~/server/utils/database/users', () => ({
        updateUserPassword: vi.fn().mockResolvedValue(undefined)
      }))
    })

    it('rehash un mot de passe bcrypt $2a$ vers scrypt', async () => {
      const { updateUserPassword } = await import('~/server/utils/database/users')
      const userId = 'user-123'
      const password = 'legacy-password'
      const bcryptHash = await bcrypt.hash(password, 10)

      await rehashIfNeeded(userId, password, bcryptHash)

      expect(updateUserPassword).toHaveBeenCalledWith(userId, expect.stringContaining(':'))
      const newHash = (updateUserPassword as any).mock.calls[0][1]
      expect(newHash).toContain(':')
      expect(newHash.split(':')).toHaveLength(2)
    })

    it('rehash un mot de passe bcrypt $2b$ vers scrypt', async () => {
      const { updateUserPassword } = await import('~/server/utils/database/users')
      const userId = 'user-456'
      const password = 'another-legacy-password'
      const bcryptHash = await bcrypt.hash(password, 10)

      await rehashIfNeeded(userId, password, bcryptHash)

      expect(updateUserPassword).toHaveBeenCalledWith(userId, expect.stringContaining(':'))
    })

    it('ne fait rien si le hash est déjà au format scrypt', async () => {
      const { updateUserPassword } = await import('~/server/utils/database/users')
      vi.clearAllMocks()

      const userId = 'user-789'
      const password = 'modern-password'
      const scryptHash = await hashPasswordCustom(password)

      await rehashIfNeeded(userId, password, scryptHash)

      expect(updateUserPassword).not.toHaveBeenCalled()
    })

    it('ne fait rien pour un hash au format inconnu', async () => {
      const { updateUserPassword } = await import('~/server/utils/database/users')
      vi.clearAllMocks()

      const userId = 'user-999'
      const password = 'test-password'
      const unknownHash = 'unknown-format'

      await rehashIfNeeded(userId, password, unknownHash)

      expect(updateUserPassword).not.toHaveBeenCalled()
    })

    it('vérifie que le nouveau hash est valide', async () => {
      const { updateUserPassword } = await import('~/server/utils/database/users')
      const userId = 'user-validate'
      const password = 'validate-password'
      const bcryptHash = await bcrypt.hash(password, 10)

      await rehashIfNeeded(userId, password, bcryptHash)

      const newHash = (updateUserPassword as any).mock.calls[0][1]
      const isValid = await verifyPasswordCustom(password, newHash)
      expect(isValid).toBe(true)
    })
  })

  describe('intégration scrypt et bcrypt', () => {
    it('peut vérifier un mot de passe contre les deux formats', async () => {
      const password = 'cross-format-password'

      // Créer un hash de chaque format
      const scryptHash = await hashPasswordCustom(password)
      const bcryptHash = await bcrypt.hash(password, 10)

      // Vérifier que les deux formats fonctionnent
      expect(await verifyPasswordCustom(password, scryptHash)).toBe(true)
      expect(await verifyPasswordCustom(password, bcryptHash)).toBe(true)

      // Vérifier qu'un mauvais mot de passe échoue avec les deux formats
      expect(await verifyPasswordCustom('wrong', scryptHash)).toBe(false)
      expect(await verifyPasswordCustom('wrong', bcryptHash)).toBe(false)
    })

    it('migration complète : bcrypt → verification → rehash → scrypt verification', async () => {
      const userId = 'migration-test-user'
      const password = 'migration-password'

      // Mock updateUserPassword pour capturer le nouveau hash
      let capturedHash: string | null = null
      vi.doMock('~/server/utils/database/users', () => ({
        updateUserPassword: vi.fn().mockImplementation(async (id: string, hash: string) => {
          capturedHash = hash
        })
      }))

      // 1. Hash initial bcrypt (Better Auth legacy)
      const bcryptHash = await bcrypt.hash(password, 10)

      // 2. Vérifier que le password bcrypt fonctionne
      expect(await verifyPasswordCustom(password, bcryptHash)).toBe(true)

      // 3. Simuler un login réussi → rehash
      await rehashIfNeeded(userId, password, bcryptHash)

      // 4. Vérifier que le hash a été capturé
      expect(capturedHash).not.toBeNull()

      // 5. Vérifier que le nouveau hash scrypt fonctionne
      expect(await verifyPasswordCustom(password, capturedHash!)).toBe(true)

      // 6. Vérifier le format scrypt
      expect(capturedHash).toContain(':')
      expect(capturedHash!.split(':')).toHaveLength(2)
    })
  })
})
