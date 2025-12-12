async function testNewUser() {
  try {
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    const password = 'TestPassword123!'

    console.log(`📝 Création d'un nouvel utilisateur...`)
    console.log(`   Email: ${email}\n`)

    const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name: 'Test User',
      }),
    })

    console.log(`📊 Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('📦 Response:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('\n✅ Compte créé avec succès !')
      console.log('   Maintenant testons la connexion...\n')

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Test de connexion
      const loginResponse = await fetch('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      console.log(`📊 Login Status: ${loginResponse.status} ${loginResponse.statusText}`)

      const loginData = await loginResponse.json()
      console.log('📦 Login Response:', JSON.stringify(loginData, null, 2))

      if (loginResponse.ok) {
        console.log('\n✅ SUCCÈS ! La connexion fonctionne avec un compte créé par Better Auth')
        console.log('   Le problème vient donc des comptes créés manuellement')
      } else {
        console.log('\n❌ Échec de connexion même avec un compte Better Auth')
      }
    } else {
      console.log('\n❌ Échec de création du compte')
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testNewUser()
