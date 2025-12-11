import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function fixProviderAccountId() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    console.log('🔧 Rendre providerAccountId nullable...\n')

    await client.query('ALTER TABLE account ALTER COLUMN "providerAccountId" DROP NOT NULL')

    console.log('✅ providerAccountId est maintenant nullable\n')

    // Vérifier la contrainte
    const checkResult = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account' AND column_name = 'providerAccountId'
    `)

    console.log('📊 Vérification:', checkResult.rows[0])

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixProviderAccountId()
