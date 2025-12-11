import { Client } from 'pg'
import { hash } from 'bcrypt'

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

async function seedUsers() {
  try {
    await client.connect()
    console.log('✅ Connected to database')

    for (const user of users) {
      // Hash password with bcrypt (Better Auth uses 10 rounds)
      const hashedPassword = await hash(user.password, 10)
      
      // Insert user (camelCase columns)
      const userResult = await client.query(
        `INSERT INTO "user" (id, email, name, "emailVerified", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, true, $3, NOW(), NOW())
         RETURNING id`,
        [user.email, user.name, user.role]
      )

      const userId = userResult.rows[0].id

      // Insert password (camelCase columns)
      await client.query(
        `INSERT INTO "password" ("userId", "hashedPassword")
         VALUES ($1, $2)`,
        [userId, hashedPassword]
      )

      // Insert account entry for credential provider (REQUIRED by Better Auth!)
      await client.query(
        `INSERT INTO "account" (id, "userId", "accountId", provider, "providerAccountId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'credential', $2, NOW(), NOW())`,
        [userId, user.email]
      )
      
      console.log(`✅ Created ${user.role}: ${user.email}`)
    }

    console.log('\n🎉 Successfully seeded 20 users!')
    console.log('\n🔑 Admin Credentials:')
    console.log('   Email: admin@test.com')
    console.log('   Password: Admin123!')
    console.log('\n📝 All other users password: Test123!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seedUsers()
