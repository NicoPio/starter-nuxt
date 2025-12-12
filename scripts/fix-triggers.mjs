import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function fixTriggers() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    console.log('🔧 Correction des triggers pour utiliser camelCase...\n')

    // Recréer la fonction trigger avec camelCase
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)

    console.log('✅ Fonction trigger mise à jour\n')

    // Recréer les triggers pour toutes les tables
    const tables = ['user', 'session', 'account', 'verification']

    for (const table of tables) {
      await client.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON "${table}"`)
      await client.query(`
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `)
      console.log(`✅ Trigger recréé pour ${table}`)
    }

    console.log('\n✅ Tous les triggers ont été mis à jour')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixTriggers()
