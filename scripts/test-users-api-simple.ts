// Test direct de l'API /api/admin/users pour debug

async function testAPI() {
  console.log('🔍 Testing /api/admin/users API endpoint...\n')

  try {
    // Note: Cette requête échouera si vous n'êtes pas authentifié
    // mais elle nous permettra de voir l'erreur exacte
    const response = await fetch('http://localhost:3000/api/admin/users?page=1&limit=20')

    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log('\nResponse body:', JSON.stringify(data, null, 2))

    if (data.users) {
      console.log(`\n✅ Found ${data.users.length} users`)
      console.log(`Total in database: ${data.pagination?.total || 0}`)
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

testAPI()
