/**
 * Password utilities for nuxt-auth-utils
 * Supports both bcrypt (legacy Better Auth) and scrypt (nuxt-auth-utils)
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import bcrypt from 'bcrypt'

/**
 * Hash a password using scrypt (nuxt-auth-utils standard)
 * @param password - Plain text password
 * @returns Hashed password with format: salt:hash
 */
export async function hashPasswordCustom(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify password against hash (supports both bcrypt and scrypt)
 * @param password - Plain text password
 * @param hashedPassword - Hashed password (bcrypt or scrypt format)
 * @returns True if password matches
 */
export async function verifyPasswordCustom(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Detect hash type
    if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
      // bcrypt hash (Better Auth legacy)
      return await bcrypt.compare(password, hashedPassword)
    } else if (hashedPassword.includes(':')) {
      // scrypt hash (nuxt-auth-utils)
      const parts = hashedPassword.split(':')
      if (parts.length !== 2) {
        return false
      }
      const [salt, hash] = parts
      const hashBuffer = Buffer.from(hash, 'hex')
      const verifyBuffer = scryptSync(password, salt, 64)

      // Ensure buffers have the same length before comparing
      if (hashBuffer.length !== verifyBuffer.length) {
        return false
      }

      return timingSafeEqual(hashBuffer, verifyBuffer)
    }

    return false
  } catch {
    // Return false for any error (invalid hex, invalid salt, etc.)
    return false
  }
}

/**
 * Rehash password if using legacy bcrypt
 * Should be called after successful login to gradually migrate passwords
 * @param userId - User ID
 * @param password - Plain text password
 * @param currentHash - Current password hash
 */
export async function rehashIfNeeded(
  userId: string,
  password: string,
  currentHash: string
): Promise<void> {
  // Only rehash if it's a bcrypt hash
  if (currentHash.startsWith('$2a$') || currentHash.startsWith('$2b$')) {
    const newHash = await hashPasswordCustom(password)

    // Import here to avoid circular dependency
    const { updateUserPassword } = await import('./database/users')
    await updateUserPassword(userId, newHash)
  }
}
