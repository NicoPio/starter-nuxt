import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Pool } = require('pg')

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  host: 'localhost',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
})

async function promoteTestUser() {
  try {
    // Promouvoir l'utilisateur test@example.com en Admin
    const result = await pool.query(
      "UPDATE users SET role = 'Admin' WHERE email = 'test@example.com' RETURNING id, email, role"
    )

    if (result.rows.length > 0) {
      console.log('✓ Utilisateur test@example.com promu en Admin:', result.rows[0])
    } else {
      console.log('❌ Utilisateur test@example.com non trouvé')
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await pool.end()
  }
}

promoteTestUser()
