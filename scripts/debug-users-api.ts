import { auth } from '../server/utils/auth'

interface DatabaseAdapter {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

async function debugUsersAPI() {
  console.log('🔍 Debugging Admin Users API...\n')

  const db = auth.options.database as DatabaseAdapter

  try {
    // 1. Count total users
    console.log('1️⃣ Counting total users...')
    const countResult = await db.query('SELECT COUNT(*) as count FROM public.user', [])
    const totalUsers = countResult.rows[0]?.count
    console.log(`   ✅ Total users in database: ${totalUsers}\n`)

    // 2. List all users
    console.log('2️⃣ Listing all users...')
    const usersResult = await db.query(
      'SELECT id, name, email, role, "emailVerified", "createdAt" FROM public.user ORDER BY "createdAt" DESC',
      []
    )
    console.log(`   ✅ Found ${usersResult.rows.length} users:`)
    usersResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - Role: ${user.role || 'NULL'} - Name: ${user.name || 'NULL'}`)
    })
    console.log('')

    // 3. Check users with Admin role
    console.log('3️⃣ Checking Admin users...')
    const adminResult = await db.query(
      'SELECT id, name, email, role FROM public.user WHERE role = $1',
      ['Admin']
    )
    console.log(`   ✅ Found ${adminResult.rows.length} Admin users:`)
    adminResult.rows.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.email} - ${admin.name || 'No name'}`)
    })
    console.log('')

    // 4. Check users with NULL role
    console.log('4️⃣ Checking users with NULL role...')
    const nullRoleResult = await db.query(
      'SELECT id, name, email, role FROM public.user WHERE role IS NULL',
      []
    )
    console.log(`   ⚠️  Found ${nullRoleResult.rows.length} users with NULL role:`)
    nullRoleResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name || 'No name'}`)
    })
    console.log('')

    // 5. Simulate the API query
    console.log('5️⃣ Simulating API query (with pagination)...')
    const page = 1
    const limit = 20
    const offset = (page - 1) * limit

    const apiQuery = 'SELECT id, name, email, "emailVerified", image, role, "createdAt", "updatedAt" FROM public.user WHERE 1=1 ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2'
    const apiResult = await db.query(apiQuery, [limit, offset])

    console.log(`   ✅ API would return ${apiResult.rows.length} users:`)
    apiResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - Role: ${user.role || 'NULL'}`)
    })
    console.log('')

    // 6. Check database schema
    console.log('6️⃣ Checking user table schema...')
    const schemaResult = await db.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user'
       ORDER BY ordinal_position`,
      []
    )
    console.log('   ✅ User table columns:')
    schemaResult.rows.forEach((col) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugUsersAPI()
