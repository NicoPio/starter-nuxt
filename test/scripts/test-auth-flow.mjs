import { Client } from 'pg'
import { compare } from 'bcrypt'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function testAuthFlow() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    const email = 'admin@test.com'
    const password = 'Admin123!'

    // Étape 1: Trouver l'utilisateur par email
    console.log('🔍 Étape 1: Recherche de l\'utilisateur par email...')
    const userResult = await client.query(
      'SELECT * FROM "user" WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé')
      process.exit(1)
    }

    const user = userResult.rows[0]
    console.log(`✅ Utilisateur trouvé: ${user.id}`)
    console.log(`   Email vérifié: ${user.emailVerified}`)
    console.log(`   Role: ${user.role}\n`)

    // Étape 2: Chercher le mot de passe
    console.log('🔍 Étape 2: Recherche du mot de passe...')
    const passwordResult = await client.query(
      'SELECT * FROM password WHERE "userId" = $1',
      [user.id]
    )

    if (passwordResult.rows.length === 0) {
      console.log('❌ Mot de passe non trouvé dans la table password')
      process.exit(1)
    }

    const passwordRecord = passwordResult.rows[0]
    console.log(`✅ Mot de passe trouvé`)
    console.log(`   Hash: ${passwordRecord.hashedPassword.substring(0, 20)}...\n`)

    // Étape 3: Vérifier le mot de passe
    console.log('🔍 Étape 3: Vérification du mot de passe avec bcrypt...')
    const isValid = await compare(password, passwordRecord.hashedPassword)

    if (!isValid) {
      console.log('❌ Mot de passe invalide')
      process.exit(1)
    }

    console.log('✅ Mot de passe valide\n')

    // Étape 4: Chercher l'account credential
    console.log('🔍 Étape 4: Recherche de l\'account credential...')
    const accountResult = await client.query(
      'SELECT * FROM account WHERE "userId" = $1 AND provider = $2',
      [user.id, 'credential']
    )

    if (accountResult.rows.length === 0) {
      console.log('❌ Account credential non trouvé')
      console.log('   Better Auth s\'attend à trouver cette entrée')

      // Vérifier s'il y a d'autres accounts
      const allAccountsResult = await client.query(
        'SELECT * FROM account WHERE "userId" = $1',
        [user.id]
      )

      console.log(`   Total accounts pour cet utilisateur: ${allAccountsResult.rows.length}`)
      if (allAccountsResult.rows.length > 0) {
        console.log('   Accounts trouvés:')
        allAccountsResult.rows.forEach(acc => {
          console.log(`     - provider: ${acc.provider}, accountId: ${acc.accountId}`)
        })
      }
    } else {
      console.log('✅ Account credential trouvé')
      const account = accountResult.rows[0]
      console.log(`   Account ID: ${account.id}`)
      console.log(`   Provider: ${account.provider}`)
      console.log(`   Provider Account ID: ${account.providerAccountId}\n`)
    }

    // Étape 5: Simulation de l'authentification Better Auth
    console.log('📊 Résumé de l\'authentification:')
    console.log('   ✅ Utilisateur existe')
    console.log('   ✅ Mot de passe est correct')
    console.log(`   ${accountResult.rows.length > 0 ? '✅' : '❌'} Account credential existe`)

    if (accountResult.rows.length > 0) {
      console.log('\n✅ Toutes les conditions sont remplies pour l\'authentification')
      console.log('   Le problème doit venir d\'ailleurs (pool de connexions, cache, etc.)')
    } else {
      console.log('\n❌ L\'account credential manque - c\'est la cause du problème')
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

testAuthFlow()
