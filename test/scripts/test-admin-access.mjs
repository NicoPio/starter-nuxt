#!/usr/bin/env node

/**
 * Test T047: Admin panel access with Admin role
 * Test T048: Role change functionality in admin panel
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

console.log('🧪 Testing Admin Panel Access (T047 & T048)\n')

// Test T047: Admin panel access
async function testAdminPanelAccess() {
  console.log('📋 T047: Test admin panel access with Admin role')

  try {
    // First, login as admin (we need to create or use existing admin)
    console.log('  1. Logging in as admin user...')

    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123456'
      })
    })

    if (!loginResponse.ok) {
      console.log('  ❌ Admin login failed. Creating admin user first...')

      // Try to create admin user
      const signupResponse = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123456',
          name: 'Admin User'
        })
      })

      if (!signupResponse.ok) {
        const error = await signupResponse.text()
        console.log(`  ⚠️  Signup failed: ${error}`)
        console.log('  💡 Assuming admin user already exists, continuing...')
      } else {
        console.log('  ✅ Admin user created')
      }
    }

    // Get session cookies
    const cookies = loginResponse.headers.get('set-cookie') || ''

    // Test accessing admin users endpoint
    console.log('  2. Testing admin users list endpoint...')
    const usersResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': cookies
      }
    })

    if (usersResponse.ok) {
      const users = await usersResponse.json()
      console.log(`  ✅ Admin panel accessible! Found ${users.users?.length || 0} users`)
      console.log('  ✅ T047: PASS - Admin can access admin panel')
      return { success: true, cookies, users }
    } else {
      const error = await usersResponse.text()
      console.log(`  ❌ T047: FAIL - ${error}`)
      return { success: false }
    }
  } catch (error) {
    console.log(`  ❌ T047: FAIL - ${error.message}`)
    return { success: false }
  }
}

// Test T048: Role change functionality
async function testRoleChange(cookies) {
  console.log('\n📋 T048: Test role change functionality in admin panel')

  try {
    // First, get list of users
    console.log('  1. Fetching user list...')
    const usersResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': cookies
      }
    })

    if (!usersResponse.ok) {
      console.log('  ❌ Failed to fetch users')
      return false
    }

    const usersData = await usersResponse.json()
    const users = usersData.users || []

    // Find a non-admin user to test role change
    const testUser = users.find(u => u.role !== 'Admin')

    if (!testUser) {
      console.log('  ⚠️  No non-admin user found to test role change')
      console.log('  💡 Creating a test user...')

      // Create test user
      const signupResponse = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testuser@example.com',
          password: 'testpass123',
          name: 'Test User'
        })
      })

      if (signupResponse.ok) {
        console.log('  ✅ Test user created')

        // Re-fetch users to get the new user's ID
        const updatedUsersResponse = await fetch(`${BASE_URL}/api/admin/users`, {
          headers: {
            'Cookie': cookies
          }
        })
        const updatedUsersData = await updatedUsersResponse.json()
        const newTestUser = updatedUsersData.users.find(u => u.email === 'testuser@example.com')

        if (newTestUser) {
          return await performRoleChange(cookies, newTestUser)
        }
      } else {
        console.log('  ❌ Failed to create test user')
        return false
      }
    } else {
      return await performRoleChange(cookies, testUser)
    }
  } catch (error) {
    console.log(`  ❌ T048: FAIL - ${error.message}`)
    return false
  }
}

async function performRoleChange(cookies, user) {
  console.log(`  2. Testing role change for user: ${user.email} (${user.role})`)

  // Change role to Contributor
  const newRole = user.role === 'User' ? 'Contributor' : 'User'
  console.log(`  3. Changing role from ${user.role} to ${newRole}...`)

  const roleChangeResponse = await fetch(`${BASE_URL}/api/admin/users/${user.id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      role: newRole
    })
  })

  if (roleChangeResponse.ok) {
    console.log(`  ✅ Role changed successfully to ${newRole}`)

    // Verify the change
    console.log('  4. Verifying role change...')
    const verifyResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': cookies
      }
    })

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json()
      const updatedUser = verifyData.users.find(u => u.id === user.id)

      if (updatedUser && updatedUser.role === newRole) {
        console.log(`  ✅ Role change verified! User now has role: ${updatedUser.role}`)
        console.log('  ✅ T048: PASS - Role change functionality works')
        return true
      } else {
        console.log(`  ❌ Role verification failed. Expected ${newRole}, got ${updatedUser?.role}`)
        return false
      }
    }
  } else {
    const error = await roleChangeResponse.text()
    console.log(`  ❌ T048: FAIL - ${error}`)
    return false
  }

  return false
}

// Run tests
async function runTests() {
  const t047Result = await testAdminPanelAccess()

  if (t047Result.success && t047Result.cookies) {
    await testRoleChange(t047Result.cookies)
  } else {
    console.log('\n⚠️  Skipping T048 - T047 must pass first')
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary:')
  console.log('  T047: Admin panel access - Run test to see result')
  console.log('  T048: Role change functionality - Run test to see result')
  console.log('='.repeat(50))
}

runTests().catch(console.error)
