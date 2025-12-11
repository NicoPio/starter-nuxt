#!/usr/bin/env node

/**
 * Cleanup test users created with incorrect password hashes
 */

import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'

console.log('🧹 Cleaning up test users with incorrect password hashes\n')

async function cleanup() {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    onnotice: () => {}
  })

  try {
    const testEmails = [
      'admin@test.com',
      'contributor@test.com',
      'user@test.com',
      'alice@test.com',
      'bob@test.com'
    ]

    console.log(`🗑️  Deleting ${testEmails.length} test users...`)

    for (const email of testEmails) {
      const result = await sql`
        DELETE FROM users WHERE email = ${email}
      `
      if (result.count > 0) {
        console.log(`  ✅ Deleted: ${email}`)
      } else {
        console.log(`  ⏭️  Not found: ${email}`)
      }
    }

    console.log('\n✅ Cleanup completed!')
    console.log('💡 Run "node seed-test-users.mjs" to recreate users with correct password hashes')

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

cleanup()
