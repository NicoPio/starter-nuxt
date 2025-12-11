#!/usr/bin/env node

/**
 * Seed test users for admin panel testing
 *
 * Creates 3 test users with different roles:
 * - admin@test.com (Admin)
 * - contributor@test.com (Contributor)
 * - user@test.com (User)
 */

import postgres from 'postgres'
import { scryptSync, randomBytes } from 'crypto'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'

console.log('👥 Seeding Test Users\n')

/**
 * Hash password using scrypt (same algorithm as server/utils/password.ts)
 */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function seedUsers() {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    onnotice: () => {}
  })

  try {
    // Hash password "Test123456!" using scrypt (compatible with nuxt-auth-utils)
    const password = 'Test123456!'
    console.log(`🔐 Hashing password: "${password}"...`)
    const hashedPassword = hashPassword(password)

    const testUsers = [
      {
        id: 'test-admin-001',
        email: 'admin@test.com',
        name: 'Admin Test User',
        role: 'Admin',
        hashedPassword
      },
      {
        id: 'test-contributor-001',
        email: 'contributor@test.com',
        name: 'Contributor Test User',
        role: 'Contributor',
        hashedPassword
      },
      {
        id: 'test-user-001',
        email: 'user@test.com',
        name: 'Regular Test User',
        role: 'User',
        hashedPassword
      },
      {
        id: 'test-user-002',
        email: 'alice@test.com',
        name: 'Alice Johnson',
        role: 'User',
        hashedPassword
      },
      {
        id: 'test-user-003',
        email: 'bob@test.com',
        name: 'Bob Smith',
        role: 'User',
        hashedPassword
      }
    ]

    console.log(`\n📝 Creating ${testUsers.length} test users...`)

    for (const user of testUsers) {
      try {
        // Check if user already exists
        const existing = await sql`
          SELECT id FROM users WHERE email = ${user.email}
        `

        if (existing.length > 0) {
          console.log(`  ⏭️  ${user.email} (${user.role}) - Already exists`)
        } else {
          await sql`
            INSERT INTO users (id, email, name, role, hashed_password, email_verified, created_at, updated_at)
            VALUES (
              ${user.id},
              ${user.email},
              ${user.name},
              ${user.role},
              ${user.hashedPassword},
              true,
              NOW(),
              NOW()
            )
          `
          console.log(`  ✅ ${user.email} (${user.role}) - Created`)
        }
      } catch (error) {
        console.error(`  ❌ ${user.email} - Error: ${error.message}`)
      }
    }

    console.log('\n📊 Current users in database:')
    const allUsers = await sql`
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `

    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role})`)
    })

    console.log('\n✅ Seed completed!')
    console.log('\n🔑 Test Credentials:')
    console.log('  Email: admin@test.com | contributor@test.com | user@test.com')
    console.log('  Password: Test123456!')

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

seedUsers()
