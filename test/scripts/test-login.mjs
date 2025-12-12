async function testLogin() {
  try {
    console.log('🔐 Test de connexion...\n')

    const response = await fetch('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Admin123!',
      }),
    })

    console.log(`📊 Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('📦 Response:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('\n✅ Connexion réussie !')
    } else {
      console.log('\n❌ Échec de la connexion')
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testLogin()
