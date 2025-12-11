#!/usr/bin/env node

/**
 * Test script to verify login + /api/users/me bug fix
 */

const BASE_URL = 'http://localhost:3000'

async function testLoginAndGetMe() {
  console.log('🧪 Test: Login puis /api/users/me\n')

  try {
    // Step 1: Login
    console.log('📝 Étape 1: Login avec test@example.com...')
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
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
    const cookies = loginRes.headers.get('set-cookie')
    if (!cookies) {
      console.error('❌ No cookies received from login!')
      process.exit(1)
    }
    console.log('🍪 Cookies received:', cookies.split(';')[0])

    // Step 2: Get current user with session cookie
    console.log('\n📝 Étape 2: GET /api/users/me avec session cookie...')
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

testLoginAndGetMe()
