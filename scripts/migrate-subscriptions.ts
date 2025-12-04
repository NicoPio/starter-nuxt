import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

async function runMigration() {
  console.log('🔄 Démarrage de la migration 002_subscriptions...')

  const pool = new Pool({
    connectionString: DATABASE_URL
  })

  try {
    const client = await pool.connect()
    console.log('✅ Connexion à PostgreSQL réussie')

    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '002_subscriptions.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Exécution du script SQL...')
    await client.query(migrationSQL)
    console.log('✅ Migration exécutée avec succès')

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
    `)

    if (result.rows.length > 0) {
      console.log('✅ Table "subscriptions" créée et vérifiée')

      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        ORDER BY ordinal_position
      `)

      console.log('\n📊 Colonnes de la table subscriptions :')
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
      })
    } else {
      console.error('❌ La table "subscriptions" n\'a pas été créée')
    }

    client.release()
    await pool.end()

    console.log('\n🎉 Migration terminée avec succès !')
    process.exit(0)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Erreur lors de la migration :', message)
    console.error(error)
    await pool.end()
    process.exit(1)
  }
}

runMigration()
