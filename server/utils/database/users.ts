/**
 * User database utilities for nuxt-auth-utils
 */

import { sql } from '../database'

export interface User {
  id: string
  email: string
  name: string | null
  role: 'User' | 'Contributor' | 'Admin'
  hashed_password: string | null
  email_verified: boolean
  image: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Get user by email
 * @param email - User email
 * @returns User or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql<User[]>`
    SELECT * FROM users
    WHERE email = ${email}
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Get user by ID
 * @param id - User ID
 * @returns User or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await sql<User[]>`
    SELECT * FROM users
    WHERE id = ${id}
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Create a new user
 * @param userData - User data
 * @returns Created user
 */
export async function createUser(userData: {
  email: string
  name: string
  hashed_password: string
  role?: 'User' | 'Contributor' | 'Admin'
}): Promise<User> {
  // Generate a unique ID
  const id = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`

  const result = await sql<User[]>`
    INSERT INTO users (id, email, name, hashed_password, role)
    VALUES (
      ${id},
      ${userData.email},
      ${userData.name},
      ${userData.hashed_password},
      ${userData.role || 'User'}
    )
    RETURNING *
  `

  return result[0]!
}

/**
 * Update user password
 * @param userId - User ID
 * @param hashedPassword - New hashed password
 */
export async function updateUserPassword(
  userId: string,
  hashedPassword: string
): Promise<void> {
  await sql`
    UPDATE users
    SET hashed_password = ${hashedPassword}, updated_at = NOW()
    WHERE id = ${userId}
  `
}

/**
 * Update user role
 * @param userId - User ID
 * @param role - New role
 */
export async function updateUserRole(
  userId: string,
  role: 'User' | 'Contributor' | 'Admin'
): Promise<void> {
  await sql`
    UPDATE users
    SET role = ${role}, updated_at = NOW()
    WHERE id = ${userId}
  `
}

/**
 * Delete user
 * @param userId - User ID
 */
export async function deleteUser(userId: string): Promise<void> {
  await sql`
    DELETE FROM users
    WHERE id = ${userId}
  `
}

/**
 * Get all users (for admin)
 * @returns Array of users
 */
export async function getAllUsers(): Promise<User[]> {
  return await sql<User[]>`
    SELECT * FROM users
    ORDER BY created_at DESC
  `
}
