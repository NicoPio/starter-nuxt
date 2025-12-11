import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

const users = [
  // 1 Admin
  { email: 'admin@test.com', name: 'Admin User', password: 'Admin123!', role: 'Admin' },

  // 4 Contributors
  { email: 'contributor1@test.com', name: 'Marie Dupont', password: 'Test123!', role: 'Contributor' },
  { email: 'contributor2@test.com', name: 'Pierre Martin', password: 'Test123!', role: 'Contributor' },
  { email: 'contributor3@test.com', name: 'Sophie Bernard', password: 'Test123!', role: 'Contributor' },
  { email: 'contributor4@test.com', name: 'Lucas Petit', password: 'Test123!', role: 'Contributor' },

  // 15 Regular Users
  { email: 'user1@test.com', name: 'Jean Moreau', password: 'Test123!', role: 'User' },
  { email: 'user2@test.com', name: 'Emma Laurent', password: 'Test123!', role: 'User' },
  { email: 'user3@test.com', name: 'Thomas Simon', password: 'Test123!', role: 'User' },
  { email: 'user4@test.com', name: 'Julie Lefebvre', password: 'Test123!', role: 'User' },
  { email: 'user5@test.com', name: 'Antoine Roux', password: 'Test123!', role: 'User' },
  { email: 'user6@test.com', name: 'Laura Morel', password: 'Test123!', role: 'User' },
  { email: 'user7@test.com', name: 'Nicolas Fournier', password: 'Test123!', role: 'User' },
  { email: 'user8@test.com', name: 'Camille Girard', password: 'Test123!', role: 'User' },
  { email: 'user9@test.com', name: 'Hugo Bonnet', password: 'Test123!', role: 'User' },
  { email: 'user10@test.com', name: 'Léa Durand', password: 'Test123!', role: 'User' },
  { email: 'user11@test.com', name: 'Paul Mercier', password: 'Test123!', role: 'User' },
  { email: 'user12@test.com', name: 'Chloé Lambert', password: 'Test123!', role: 'User' },
  { email: 'user13@test.com', name: 'Maxime Rousseau', password: 'Test123!', role: 'User' },
  { email: 'user14@test.com', name: 'Sarah Vincent', password: 'Test123!', role: 'User' },
  { email: 'user15@test.com', name: 'Alexandre Garnier', password: 'Test123!', role: 'User' },
]

async function reseedUsers() {
  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    // Supprimer tous les utilisateurs de test existants
    console.log('🗑️  Suppression des utilisateurs existants...')
    const emails = users.map(u => `'${u.email}'`).join(',')
    const deleteResult = await client.query(
      `DELETE FROM "user" WHERE email IN (${emails})`
    )
    console.log(`✅ ${deleteResult.rowCount} utilisateur(s) supprimé(s)\n`)

    // Recréer les utilisateurs via Better Auth API
    console.log('📝 Création des utilisateurs via Better Auth API...\n')

    let successCount = 0
    let failCount = 0

    for (const user of users) {
      try {
        // Créer le compte via Better Auth sign-up API
        const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            name: user.name,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.log(`❌ ${user.role} ${user.email}: ${error.message}`)
          failCount++
          continue
        }

        const data = await response.json()
        const userId = data.user.id

        // Mettre à jour le rôle si ce n'est pas "User"
        if (user.role !== 'User') {
          await client.query(
            'UPDATE "user" SET role = $1 WHERE id = $2',
            [user.role, userId]
          )
        }

        // Vérifier l'email pour admin et contributors
        if (user.role === 'Admin' || user.role === 'Contributor') {
          await client.query(
            'UPDATE "user" SET "emailVerified" = true WHERE id = $1',
            [userId]
          )
        }

        console.log(`✅ ${user.role.padEnd(12)} ${user.email}`)
        successCount++

      } catch (error) {
        console.log(`❌ ${user.email}: ${error.message}`)
        failCount++
      }

      // Petit délai pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`\n🎉 Terminé ! ${successCount} succès, ${failCount} échecs`)

    console.log('\n🔑 Identifiants Admin:')
    console.log('   Email: admin@test.com')
    console.log('   Password: Admin123!')
    console.log('\n📝 Tous les autres mots de passe: Test123!')

    // Vérifier le résultat
    console.log('\n📊 Vérification finale:')
    const stats = await client.query(`
      SELECT role, COUNT(*) as count
      FROM "user"
      WHERE email LIKE '%test.com'
      GROUP BY role
      ORDER BY role
    `)
    stats.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`)
    })

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

reseedUsers()
