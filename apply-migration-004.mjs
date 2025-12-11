import { Client } from 'pg'
import { readFileSync } from 'fs'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function applyMigration() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    const migration = readFileSync('supabase/migrations/004_fix_provider_id.sql', 'utf-8')

    console.log('📋 Application de la migration 004...\n')
    console.log(migration)
    console.log()

    await client.query(migration)

    console.log('✅ Migration 004 appliquée avec succès\n')

    // Vérifier que la colonne a été renommée
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'account' AND column_name IN ('provider', 'providerId')
    `)

    console.log('📊 Colonnes trouvées:', checkResult.rows.map(r => r.column_name).join(', '))

    if (checkResult.rows.some(r => r.column_name === 'providerId')) {
      console.log('✅ La colonne providerId existe maintenant')
    } else {
      console.log('❌ La colonne providerId n\'existe pas encore')
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
