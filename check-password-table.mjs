import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function checkPasswordTable() {
  try {
    await client.connect()

    // Vérifier les colonnes de la table password
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'password'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colonnes de la table password:')
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`)
    })
    console.log()

    // Vérifier l'entrée password pour admin
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

    // Essayer de récupérer le mot de passe avec différents noms de colonnes
    console.log('🔍 Test avec userId (camelCase):')
    try {
      const pwdResult1 = await client.query(
        'SELECT * FROM password WHERE "userId" = $1',
        [userId]
      )
      console.log(`   Résultat: ${pwdResult1.rows.length} ligne(s) trouvée(s)`)
      if (pwdResult1.rows.length > 0) {
        console.log('   ✅ Mot de passe trouvé avec userId')
        console.log(`   Hash: ${pwdResult1.rows[0].hashedPassword?.substring(0, 20)}...`)
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`)
    }
    console.log()

    console.log('🔍 Test avec user_id (snake_case):')
    try {
      const pwdResult2 = await client.query(
        'SELECT * FROM password WHERE user_id = $1',
        [userId]
      )
      console.log(`   Résultat: ${pwdResult2.rows.length} ligne(s) trouvée(s)`)
      if (pwdResult2.rows.length > 0) {
        console.log('   ✅ Mot de passe trouvé avec user_id')
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`)
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

checkPasswordTable()
