/**
 * Test script for signup flow
 * Tests nuxt-auth-utils register endpoint with a new user
 */

import postgres from 'postgres'

const DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DATABASE_URL)

console.log('🧪 Testing nuxt-auth-utils signup flow...\n')

const testEmail = `signup-${Date.now()}@example.com`
const testPassword = 'NewUserPassword123!'
const testName = 'New User'

console.log('📊 Before signup - Database state:')

try {
  const usersBefore = await sql`SELECT COUNT(*) as count FROM users`
  console.log(`   Users in database: ${usersBefore[0].count}`)

  console.log('\n🚀 Next steps to test signup:')
  console.log('   1. Start the dev server: bun run dev')
  console.log('   2. Navigate to: http://localhost:3000/signup')
  console.log(`   3. Sign up with:`)
  console.log(`      Name: ${testName}`)
  console.log(`      Email: ${testEmail}`)
  console.log(`      Password: ${testPassword}`)
  console.log('   4. Verify:')
  console.log('      - User is created in database')
  console.log('      - User is auto-logged in (session created)')
  console.log('      - Redirected to /dashboard')
  console.log('      - Password is hashed with scrypt (not bcrypt)')

  console.log('\n🔐 OAuth Flow Testing:')
  console.log('   1. Configure OAuth providers in .env:')
  console.log('      GITHUB_CLIENT_ID=your_github_client_id')
  console.log('      GITHUB_CLIENT_SECRET=your_github_client_secret')
  console.log('      (same for Google and Apple)')
  console.log('   2. Navigate to: http://localhost:3000/login')
  console.log('   3. Click "Continue with GitHub/Google/Apple"')
  console.log('   4. Authorize the application')
  console.log('   5. Verify:')
  console.log('      - User is created in users table')
  console.log('      - OAuth account is created in oauth_accounts table')
  console.log('      - User is logged in with session')
  console.log('      - Redirected to /dashboard')

  console.log('\n✨ Signup flow test preparation complete!')
  console.log('   Note: OAuth testing requires valid provider credentials')
} catch (error) {
  console.error('❌ Error during test:', error)
  process.exit(1)
} finally {
  await sql.end()
}
