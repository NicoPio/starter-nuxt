import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
})

async function checkUsers() {
  const result = await pool.query(
    `SELECT email, name, role, "createdAt" FROM "user" ORDER BY role DESC, name ASC`
  )

  console.log('\n📊 Users in database:\n')
  console.table(result.rows.map(row => ({
    Email: row.email,
    Name: row.name,
    Role: row.role,
    Created: new Date(row.createdAt).toLocaleString()
  })))

  const roleCount = await pool.query(
    `SELECT role, COUNT(*) as count FROM "user" GROUP BY role ORDER BY role`
  )

  console.log('\n📈 User count by role:\n')
  console.table(roleCount.rows)

  await pool.end()
}

checkUsers().catch(console.error)
