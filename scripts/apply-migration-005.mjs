import { Client } from 'pg'
import { readFileSync } from 'fs'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function applyMigration() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    const migration = readFileSync('supabase/migrations/005_add_password_to_account.sql', 'utf-8')

    console.log('📋 Application de la migration 005...\n')

    await client.query(migration)

    console.log('✅ Migration 005 appliquée avec succès\n')

    // Vérifier la migration
    console.log('🔍 Vérification...\n')

    // Vérifier que la colonne password existe
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'account' AND column_name = 'password'
    `)

    if (columnCheck.rows.length > 0) {
      console.log('✅ Colonne password ajoutée à account')
    } else {
      console.log('❌ Colonne password n\'existe pas dans account')
    }

    // Vérifier que les mots de passe ont été migrés
    const dataCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM account
      WHERE "providerId" = 'credential' AND password IS NOT NULL
    `)

    console.log(`✅ ${dataCheck.rows[0].count} mot(s) de passe migré(s) vers account.password\n`)

    // Afficher un exemple
    const sampleCheck = await client.query(`
      SELECT id, "userId", "providerId", LEFT(password, 20) as password_sample
      FROM account
      WHERE "providerId" = 'credential'
      LIMIT 1
    `)

    if (sampleCheck.rows.length > 0) {
      console.log('📊 Exemple d\'entrée account avec password:')
      console.log(`   User ID: ${sampleCheck.rows[0].userId}`)
      console.log(`   Provider ID: ${sampleCheck.rows[0].providerId}`)
      console.log(`   Password (sample): ${sampleCheck.rows[0].password_sample}...`)
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

applyMigration()
