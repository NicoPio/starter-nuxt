#!/usr/bin/env node

/**
 * Test login with corrected password hashes
 */

const BASE_URL = 'http://localhost:3000'

console.log('🧪 Testing Login with Fixed Password Hashes\n')

async function testLogin() {
  const testCredentials = [
    { email: 'admin@test.com', password: 'Test123456!', expectedRole: 'Admin' },
    { email: 'contributor@test.com', password: 'Test123456!', expectedRole: 'Contributor' },
    { email: 'user@test.com', password: 'Test123456!', expectedRole: 'User' }
  ]

  for (const cred of testCredentials) {
    console.log(`🔐 Testing login: ${cred.email}`)

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cred.email,
          password: cred.password
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`  ✅ Login successful!`)
        console.log(`     Role: ${data.user.role}`)
        console.log(`     Name: ${data.user.name}`)

        if (data.user.role === cred.expectedRole) {
          console.log(`     ✅ Role matches expected: ${cred.expectedRole}`)
        } else {
          console.log(`     ⚠️  Role mismatch! Expected: ${cred.expectedRole}, Got: ${data.user.role}`)
        }
      } else {
        const error = await response.json()
        console.log(`  ❌ Login failed: ${error.message}`)
        console.log(`     Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`  ❌ Request error: ${error.message}`)
    }

    console.log('')
  }

  console.log('✅ Login tests completed!')
}

testLogin()
