import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function checkAccount() {
  try {
    await client.connect()

    // Vérifier les colonnes de la table account
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colonnes de la table account:')
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    console.log()

    // Vérifier l'entrée account pour admin
    const adminUser = await client.query(
      'SELECT id, email FROM "user" WHERE email = $1',
      ['admin@test.com']
    )

    if (adminUser.rows.length === 0) {
      console.log('❌ Utilisateur admin introuvable')
      process.exit(1)
    }

    const userId = adminUser.rows[0].id
    console.log(`👤 User ID: ${userId}\n`)

    // Récupérer toutes les colonnes de account
    const accountResult = await client.query(
      `SELECT * FROM account WHERE "userId" = $1`,
      [userId]
    )

    console.log(`📊 Nombre d'entrées account pour admin: ${accountResult.rows.length}\n`)

    if (accountResult.rows.length > 0) {
      accountResult.rows.forEach((acc, idx) => {
        console.log(`Entrée ${idx + 1}:`)
        Object.entries(acc).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`)
        })
        console.log()
      })
    }

    // Vérifier avec une requête similaire à celle de Better Auth
    console.log('🔍 Test de requête Better Auth style:\n')
    const betterAuthQuery = await client.query(
      `SELECT * FROM account WHERE "userId" = $1 AND provider = $2`,
      [userId, 'credential']
    )

    console.log(`   Résultat: ${betterAuthQuery.rows.length} lignes trouvées`)
    if (betterAuthQuery.rows.length > 0) {
      console.log('   ✅ Better Auth devrait trouver cette entrée')
    } else {
      console.log('   ❌ Better Auth ne trouve pas l\'entrée credential')
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

checkAccount()
