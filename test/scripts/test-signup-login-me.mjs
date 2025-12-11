#!/usr/bin/env node

/**
 * Test complet: Signup → Login → /api/users/me
 */

const BASE_URL = 'http://localhost:3000'

async function testFullFlow() {
  console.log('🧪 Test complet: Signup → Login → /api/users/me\n')

  const randomEmail = `test_${Date.now()}@example.com`
  const password = 'Password123!'

  try {
    // Step 1: Signup
    console.log(`📝 Étape 1: Signup avec ${randomEmail}...`)
    const signupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: randomEmail,
        password: password,
        name: 'Test User',
      }),
    })

    if (!signupRes.ok) {
      const error = await signupRes.json()
      console.error('❌ Signup failed:', error)
      process.exit(1)
    }

    const signupData = await signupRes.json()
    console.log('✅ Signup successful:', signupData)

    // Extract cookies from signup response
    let cookies = signupRes.headers.get('set-cookie')
    if (cookies) {
      console.log('🍪 Cookies from signup:', cookies.split(';')[0])

      // Test /api/users/me directly after signup
      console.log('\n📝 Étape 2: GET /api/users/me après signup...')
      const meAfterSignupRes = await fetch(`${BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Cookie: cookies,
        },
      })

      if (meAfterSignupRes.ok) {
        const userData = await meAfterSignupRes.json()
        console.log('✅ /api/users/me après signup successful:', userData)
        console.log('\n🎉 BUG CORRIGÉ: Signup auto-login + /api/users/me fonctionne!')
        process.exit(0)
      } else {
        const error = await meAfterSignupRes.json()
        console.error('❌ /api/users/me après signup failed:', error)
      }
    }

    // Step 3: Login explicite
    console.log(`\n📝 Étape 3: Login explicite avec ${randomEmail}...`)
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: randomEmail,
        password: password,
      }),
    })

    if (!loginRes.ok) {
      const error = await loginRes.json()
      console.error('❌ Login failed:', error)
      process.exit(1)
    }

    const loginData = await loginRes.json()
    console.log('✅ Login successful:', loginData)

    // Extract cookies from login response
    cookies = loginRes.headers.get('set-cookie')
    if (!cookies) {
      console.error('❌ No cookies received from login!')
      process.exit(1)
    }
    console.log('🍪 Cookies from login:', cookies.split(';')[0])

    // Step 4: Get current user with session cookie
    console.log('\n📝 Étape 4: GET /api/users/me après login...')
    const meRes = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        Cookie: cookies,
      },
    })

    if (!meRes.ok) {
      const error = await meRes.json()
      console.error('❌ /api/users/me failed:', error)
      console.error('\n🐛 BUG TOUJOURS PRÉSENT: Erreur 401 après login!')
      process.exit(1)
    }

    const userData = await meRes.json()
    console.log('✅ /api/users/me successful:', userData)
    console.log('\n🎉 BUG CORRIGÉ: Login + /api/users/me fonctionne!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

testFullFlow()
