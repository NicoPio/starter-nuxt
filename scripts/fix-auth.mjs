import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function fixAuth() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    // Vérifier l'utilisateur admin
    const userResult = await client.query(
      'SELECT id, email, role, "emailVerified" FROM "user" WHERE email = $1',
      ['admin@test.com']
    )

    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur admin introuvable')
      process.exit(1)
    }

    const user = userResult.rows[0]
    console.log('📋 Utilisateur admin:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Email vérifié: ${user.emailVerified}\n`)

    // Vérifier le mot de passe
    const passwordResult = await client.query(
      'SELECT "userId", "hashedPassword" FROM password WHERE "userId" = $1',
      [user.id]
    )

    if (passwordResult.rows.length === 0) {
      console.log('❌ Mot de passe introuvable')
      process.exit(1)
    }

    console.log('✅ Mot de passe existe\n')

    // Vérifier l'entrée account
    const accountResult = await client.query(
      'SELECT id, "userId", "accountId", provider, "providerAccountId" FROM account WHERE "userId" = $1',
      [user.id]
    )

    console.log(`📋 Entrées account trouvées: ${accountResult.rows.length}`)
    if (accountResult.rows.length > 0) {
      accountResult.rows.forEach(acc => {
        console.log(`   - Provider: ${acc.provider}, AccountId: ${acc.accountId}`)
      })
    }

    // Vérifier si l'entrée credential existe
    const credentialAccount = accountResult.rows.find(acc => acc.provider === 'credential')

    if (!credentialAccount) {
      console.log('\n⚠️  Aucune entrée account avec provider="credential" trouvée')
      console.log('🔧 Création de l\'entrée account...')

      await client.query(
        `INSERT INTO account (id, "userId", "accountId", provider, "providerAccountId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'credential', $2, NOW(), NOW())`,
        [user.id, user.email]
      )

      console.log('✅ Entrée account créée avec succès\n')
    } else {
      console.log('\n✅ Entrée account credential existe déjà\n')
    }

    // Afficher toutes les tables Better Auth
    console.log('📊 Statistiques des tables Better Auth:')
    const tables = ['user', 'password', 'account', 'session', 'verification']

    for (const table of tables) {
      const countResult = await client.query(`SELECT COUNT(*) FROM "${table}"`)
      console.log(`   ${table}: ${countResult.rows[0].count} entrées`)
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixAuth()
