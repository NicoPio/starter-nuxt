import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

function getEncryptionKey(): Buffer {
  const config = useRuntimeConfig()
  const key = config.stripe.encryptionKey

  if (!key) {
    throw createError({
      statusCode: 500,
      statusMessage: 'STRIPE_ENCRYPTION_KEY environment variable not set',
    })
  }

  // La clé doit faire 32 bytes pour AES-256
  if (key.length !== 64) {
    throw createError({
      statusCode: 500,
      statusMessage: 'STRIPE_ENCRYPTION_KEY must be 64 hex characters (32 bytes)',
    })
  }

  return Buffer.from(key, 'hex')
}

/**
 * Chiffre une clé API Stripe avec AES-256-GCM
 * @param plaintext - Texte en clair à chiffrer
 * @returns Texte chiffré en format hexadécimal
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const salt = randomBytes(SALT_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const tag = cipher.getAuthTag()

  // Format: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted])

  return result.toString('hex')
}

/**
 * Déchiffre une clé API Stripe chiffrée avec AES-256-GCM
 * @param ciphertext - Texte chiffré en format hexadécimal
 * @returns Texte en clair déchiffré
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const stringValue = Buffer.from(ciphertext, 'hex')

  // Extract salt (not used in decryption but kept for consistency)
  stringValue.subarray(0, SALT_LENGTH)
  const iv = stringValue.subarray(SALT_LENGTH, TAG_POSITION)
  const tag = stringValue.subarray(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = stringValue.subarray(ENCRYPTED_POSITION)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Génère une nouvelle clé de chiffrement AES-256
 * @returns Clé de 64 caractères hexadécimaux (32 bytes)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Masque partiellement une clé API pour affichage sécurisé
 * @param apiKey - Clé API à masquer
 * @returns Objet avec prefix, lastFour et masked
 */
export function maskApiKey(apiKey: string): { prefix: string; lastFour: string; masked: string } {
  if (!apiKey || apiKey.length < 10) {
    return {
      prefix: '',
      lastFour: '',
      masked: '••••••••••••••••',
    }
  }

  // Extraire le préfixe (sk_test, sk_live, pk_test, pk_live, whsec)
  const parts = apiKey.split('_')
  const prefix = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : apiKey.substring(0, 7)
  const lastFour = apiKey.substring(apiKey.length - 4)

  // Créer la version masquée
  const maskedMiddle = '••••••••••••••••••••'
  const masked = `${prefix}_${maskedMiddle}${lastFour}`

  return {
    prefix,
    lastFour,
    masked,
  }
}
