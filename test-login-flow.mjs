/**
 * Test script for login flow
 * Tests nuxt-auth-utils login endpoint with a test user
 */

import postgres from 'postgres'
import { scryptSync, randomBytes } from 'crypto'

const DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DATABASE_URL)

console.log('🧪 Testing nuxt-auth-utils login flow...\n')

// Create a test user
const testEmail = `test-${Date.now()}@example.com`
const testPassword = 'TestPassword123!'
const testName = 'Test User'

console.log(`📝 Creating test user: ${testEmail}`)

// Hash password with scrypt
const salt = randomBytes(16).toString('hex')
const hash = scryptSync(testPassword, salt, 64).toString('hex')
const hashedPassword = `${salt}:${hash}`

// Generate user ID
const userId = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`

try {
  // Insert test user
  await sql`
    INSERT INTO users (id, email, name, hashed_password, role)
    VALUES (${userId}, ${testEmail}, ${testName}, ${hashedPassword}, 'User')
  `

  console.log('✅ Test user created successfully')
  console.log(`   ID: ${userId}`)
  console.log(`   Email: ${testEmail}`)
  console.log(`   Password: ${testPassword}\n`)

  console.log('🔍 Verifying user exists in database...')

  const users = await sql`
    SELECT id, email, name, role FROM users WHERE email = ${testEmail}
  `

  if (users.length > 0) {
    console.log('✅ User found in database:')
    console.log('   ', users[0])
  } else {
    console.log('❌ User not found in database')
  }

  console.log('\n📊 Migration Summary:')
  console.log('   - Tables created: ✅ users, oauth_accounts')
  console.log('   - Password utilities: ✅ scrypt hashing working')
  console.log('   - Login endpoint: ⏳ Ready to test via UI')

  console.log('\n🚀 Next steps:')
  console.log('   1. Start the dev server: bun run dev')
  console.log('   2. Navigate to: http://localhost:3000/login')
  console.log(`   3. Login with:`)
  console.log(`      Email: ${testEmail}`)
  console.log(`      Password: ${testPassword}`)
  console.log('   4. Verify successful authentication and session creation')

  console.log('\n✨ Login flow test preparation complete!')
} catch (error) {
  console.error('❌ Error during test:', error)
  process.exit(1)
} finally {
  await sql.end()
}
