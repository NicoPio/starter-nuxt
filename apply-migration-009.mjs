#!/usr/bin/env node

/**
 * Apply migration 009: Fix Stripe Foreign Keys
 *
 * This script applies the migration to fix foreign key constraints
 * in user_subscriptions and payment_history tables after the
 * Better Auth → nuxt-auth-utils migration.
 */

import { readFileSync } from 'fs'
import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'

console.log('🔧 Applying Migration 009: Fix Stripe Foreign Keys\n')

async function applyMigration() {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    onnotice: () => {}  // Suppress notices
  })

  try {
    console.log('📖 Reading migration file...')
    const migrationSQL = readFileSync('./supabase/migrations/009_fix_stripe_foreign_keys.sql', 'utf8')

    console.log('🚀 Executing migration...\n')

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.toLowerCase().includes('alter table') ||
          statement.toLowerCase().includes('comment on')) {
        console.log(`  Executing: ${statement.substring(0, 60)}...`)
        await sql.unsafe(statement)
      }
    }

    console.log('\n✅ Migration 009 applied successfully!')
    console.log('\n📊 Verification:')

    // Verify user_subscriptions FK
    const orphanedSubscriptions = await sql`
      SELECT COUNT(*) as count
      FROM user_subscriptions us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE u.id IS NULL
    `
    console.log(`  Orphaned subscriptions: ${orphanedSubscriptions[0].count}`)

    // Verify payment_history FK
    const orphanedPayments = await sql`
      SELECT COUNT(*) as count
      FROM payment_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE u.id IS NULL
    `
    console.log(`  Orphaned payments: ${orphanedPayments[0].count}`)

    if (orphanedSubscriptions[0].count === '0' && orphanedPayments[0].count === '0') {
      console.log('\n✅ All foreign keys are valid!')
    } else {
      console.log('\n⚠️  Warning: Some orphaned records detected')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

applyMigration()
