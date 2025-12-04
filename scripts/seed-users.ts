import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.default.hash(password, 10)
}

const users = [
  { email: 'admin1@example.com', name: 'Alice Admin', role: 'Admin', password: 'password123' },
  { email: 'admin2@example.com', name: 'Bob Admin', role: 'Admin', password: 'password123' },
  { email: 'contributor1@example.com', name: 'Charlie Contributor', role: 'Contributor', password: 'password123' },
  { email: 'contributor2@example.com', name: 'Diana Contributor', role: 'Contributor', password: 'password123' },
  { email: 'contributor3@example.com', name: 'Ethan Contributor', role: 'Contributor', password: 'password123' },
  { email: 'user1@example.com', name: 'Frank User', role: 'User', password: 'password123' },
  { email: 'user2@example.com', name: 'Grace User', role: 'User', password: 'password123' },
  { email: 'user3@example.com', name: 'Henry User', role: 'User', password: 'password123' },
  { email: 'user4@example.com', name: 'Iris User', role: 'User', password: 'password123' },
  { email: 'user5@example.com', name: 'Jack User', role: 'User', password: 'password123' },
]

async function seedUsers() {
  console.log('🌱 Seeding users...')

  for (const user of users) {
    const hashedPassword = await hashPassword(user.password)

    try {
      const result = await pool.query(
        `INSERT INTO "user" (id, email, name, "emailVerified", image, "createdAt", "updatedAt", role)
         VALUES (gen_random_uuid(), $1, $2, false, null, NOW(), NOW(), $3)
         ON CONFLICT (email) DO UPDATE SET role = $3, name = $2
         RETURNING id`,
        [user.email, user.name, user.role]
      )

      await pool.query(
        `INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'credential', $3, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [result.rows[0].id, user.email, hashedPassword]
      )

      console.log(`✅ ${user.email} (${user.role})`)
    } catch (error) {
      console.error(`❌ Failed to seed ${user.email}:`, error)
    }
  }

  await pool.end()
  console.log('✨ Seeding complete!')
}

seedUsers().catch(console.error)
