async function testSignup() {
  try {
    console.log('📝 Test de création de compte via Better Auth...\n')

    const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test-better-auth@example.com',
        password: 'TestPassword123!',
        name: 'Test Better Auth',
      }),
    })

    console.log(`📊 Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('📦 Response:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('\n✅ Compte créé avec succès !')
      console.log('   Maintenant testons la connexion avec ce compte...\n')

      // Test de connexion
      const loginResponse = await fetch('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test-better-auth@example.com',
          password: 'TestPassword123!',
        }),
      })

      console.log(`📊 Login Status: ${loginResponse.status} ${loginResponse.statusText}`)

      const loginData = await loginResponse.json()
      console.log('📦 Login Response:', JSON.stringify(loginData, null, 2))

      if (loginResponse.ok) {
        console.log('\n✅ Connexion réussie avec le compte créé par Better Auth')
      } else {
        console.log('\n❌ Échec de la connexion même avec un compte créé par Better Auth')
      }
    } else {
      console.log('\n❌ Échec de création du compte')
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testSignup()
