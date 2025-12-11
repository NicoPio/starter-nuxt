# Better Auth → Nuxt Auth Utils Migration Plan

## Overview

This document provides a step-by-step migration guide from Better Auth to nuxt-auth-utils for your Nuxt 4 starter project.

## Why Migrate?

| Factor | Better Auth | nuxt-auth-utils | Winner |
|--------|------------|-----------------|--------|
| Setup Complexity | Database required | Cookie-based | nuxt-auth-utils |
| Serverless Friendliness | Requires session store | Native support | nuxt-auth-utils |
| WebAuthn Support | No | Yes | nuxt-auth-utils |
| Bundle Size | Larger | Smaller (tree-shakeable) | nuxt-auth-utils |
| Session Management | Table-based | Cookie-based | nuxt-auth-utils |
| OAuth Providers | 50+ | 40+ | Comparable |
| Password Hashing | argon2 | scrypt | Comparable |
| Learning Curve | Steep | Moderate | nuxt-auth-utils |

**Best For Your Project**: nuxt-auth-utils is ideal for a Nuxt 4 starter because:
- Minimal database schema needed
- Perfect for edge/serverless deployments
- WebAuthn support for modern auth
- Smaller bundle size
- Simpler session management

---

## Timeline Overview

```
Week 1: Parallel Setup & Data Migration
├─ Mon-Tue: Install & Configure
├─ Wed-Thu: Migrate user data
└─ Fri: Verify data integrity

Week 2: Component & Route Migration
├─ Mon-Tue: Update composables
├─ Wed-Thu: Migrate API routes
└─ Fri: Test both auth systems in parallel

Week 3: Testing & Cutover
├─ Mon-Wed: Integration testing
├─ Thu: Feature flag cutover
└─ Fri: Deactivate Better Auth

Week 4: Cleanup
├─ Mon-Tue: Remove old dependencies
├─ Wed-Thu: Update documentation
└─ Fri: Monitor production
```

---

## Phase 1: Parallel Setup (Days 1-3)

### Day 1: Installation & Environment Setup

#### Step 1.1: Install nuxt-auth-utils
```bash
npm install nuxt-auth-utils
```

#### Step 1.2: Generate Session Password
```bash
# Generate a secure 32+ character password
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

#### Step 1.3: Update Environment Variables
```bash
# .env.local
NUXT_SESSION_PASSWORD=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0

# OAuth providers (GitHub example)
NUXT_OAUTH_GITHUB_CLIENT_ID=your_client_id_here
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_client_secret_here

# Keep existing Better Auth config
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
```

#### Step 1.4: Update nuxt.config.ts
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-auth-utils',  // Add this
    // ... existing modules
  ],

  auth: {
    loadStrategy: 'ssr',
    hash: {
      scrypt: {
        cost: 16384,
        blockSize: 8,
        parallelization: 1
      }
    }
  },

  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 7,  // 1 week
      name: 'nuxt-session',
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    },

    oauth: {
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET
      },
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
      }
    }
  }
})
```

#### Step 1.5: Create Database Schema
```sql
-- Create new users table for nuxt-auth-utils
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT,                      -- NULL for OAuth-only users
  avatar TEXT,
  role TEXT DEFAULT 'user',           -- user, contributor, admin
  banned BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth provider mappings
CREATE TABLE user_oauth_providers (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,             -- 'github', 'google', 'apple'
  providerId TEXT NOT NULL,
  email TEXT,
  username TEXT,
  avatar TEXT,
  accessToken TEXT,
  refreshToken TEXT,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, providerId)
);

-- WebAuthn credentials (optional, for passkey support)
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  publicKey TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  backedUp BOOLEAN DEFAULT FALSE,
  transports TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Checkpoint**: Verify nuxt-auth-utils is installed and environment is configured.

---

### Day 2: Create New Auth Routes (Parallel to Better Auth)

#### Step 2.1: Create Login Route
```typescript
// server/api/auth/login.post.ts
import { hashPassword, verifyPassword } from '#auth-utils'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)

  const { email, password } = await z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parseAsync(body)

  // Find user in new schema
  const user = await db.users.findUnique({
    where: { email }
  })

  if (!user || !user.password) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password'
    })
  }

  // Verify password
  const isValid = await verifyPassword(user.password, password)

  if (!isValid) {
    // Log failed attempt
    await db.auditLogs.create({
      data: {
        userId: user.id,
        action: 'login_failed',
        reason: 'invalid_password',
        ipAddress: getClientIP(event),
        status: 'failed'
      }
    })

    throw createError({
      statusCode: 401,
      message: 'Invalid email or password'
    })
  }

  // Check if rehash needed
  if (passwordNeedsRehash(user.password)) {
    const newHash = await hashPassword(password)
    await db.users.update({
      where: { id: user.id },
      data: { password: newHash }
    })
  }

  // Set session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    },
    loggedInAt: Date.now()
  })

  // Log successful login
  await db.auditLogs.create({
    data: {
      userId: user.id,
      action: 'login',
      ipAddress: getClientIP(event),
      userAgent: getHeader(event, 'user-agent'),
      status: 'success'
    }
  })

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
})
```

#### Step 2.2: Create Signup Route
```typescript
// server/api/auth/signup.post.ts
import { hashPassword } from '#auth-utils'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, password, name } = await z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional()
  }).parseAsync(body)

  // Check if user exists
  const existing = await db.users.findUnique({
    where: { email }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Email already registered'
    })
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create user
  const user = await db.users.create({
    data: {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user'
    }
  })

  // Set session (auto sign-in)
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    loggedInAt: Date.now()
  })

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
})
```

#### Step 2.3: Create Logout Route
```typescript
// server/api/auth/logout.post.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (session.user?.id) {
    // Log logout
    await db.auditLogs.create({
      data: {
        userId: session.user.id,
        action: 'logout',
        ipAddress: getClientIP(event),
        status: 'success'
      }
    })
  }

  await clearUserSession(event)

  return { success: true }
})
```

#### Step 2.4: Create OAuth Routes
```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
    scope: ['user:email', 'read:user']
  },
  async onSuccess(event, { user, tokens }) {
    // Find or create user
    let dbUser = await db.users.findFirst({
      where: {
        userOAuthProviders: {
          some: {
            provider: 'github',
            providerId: user.id.toString()
          }
        }
      }
    })

    if (!dbUser) {
      dbUser = await db.users.create({
        data: {
          email: user.email || `github-${user.id}@example.com`,
          name: user.name || user.login,
          avatar: user.avatar_url,
          role: 'user'
        }
      })
    }

    // Store OAuth provider mapping
    await db.userOAuthProviders.upsert({
      where: {
        provider_providerId: {
          provider: 'github',
          providerId: user.id.toString()
        }
      },
      create: {
        userId: dbUser.id,
        provider: 'github',
        providerId: user.id.toString(),
        email: user.email,
        username: user.login,
        avatar: user.avatar_url,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      },
      update: {
        avatar: user.avatar_url,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      }
    })

    // Set session
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        avatar: dbUser.avatar
      },
      loggedInAt: Date.now()
    })

    // Log successful OAuth
    await db.auditLogs.create({
      data: {
        userId: dbUser.id,
        action: 'oauth_login',
        provider: 'github',
        ipAddress: getClientIP(event),
        status: 'success'
      }
    })

    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=github_auth_failed')
  }
})
```

#### Step 2.5: Create Session Plugin
```typescript
// server/plugins/session.ts
export default defineNitroPlugin(() => {
  // Extend session on fetch
  sessionHooks.hook('fetch', async (session, event) => {
    if (!session.user?.id) {
      return
    }

    // Verify user still exists and is active
    const user = await db.users.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'User not found'
      })
    }

    if (user.banned) {
      throw createError({
        statusCode: 403,
        message: 'Account suspended'
      })
    }

    // Update session with fresh data
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    }
  })

  // Log on clear/logout
  sessionHooks.hook('clear', async (session, event) => {
    // Already logged in logout route
  })
})
```

**Checkpoint**: Test new routes with Postman/Thunder Client. Both auth systems should work independently.

---

### Day 3: Verify Parallel Setup

#### Step 3.1: Test New Routes
```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","name":"Test User"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# Test logout
curl -X POST http://localhost:3000/api/auth/logout \
  -c cookies.txt -b cookies.txt
```

#### Step 3.2: Verify Database
```sql
-- Check new schema
SELECT * FROM users;
SELECT * FROM user_oauth_providers;
```

**Checkpoint**: All new routes working, database populated with test users.

---

## Phase 2: Data Migration (Days 4-5)

### Day 4: Migrate Existing Users

#### Step 4.1: Create Migration Script
```typescript
// scripts/migrate-from-better-auth.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

async function migrateUsers() {
  console.log('Migrating users...')

  // Get all users from Better Auth
  const { data: betterAuthUsers, error } = await supabase
    .from('user')
    .select('id, email, name, role')

  if (error) {
    console.error('Error fetching users:', error)
    return
  }

  // Insert into new users table
  const { error: insertError } = await supabase
    .from('users')
    .upsert(
      betterAuthUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      })),
      { onConflict: 'id' }
    )

  if (insertError) {
    console.error('Error inserting users:', insertError)
    return
  }

  console.log(`✓ Migrated ${betterAuthUsers.length} users`)
}

async function migratePasswords() {
  console.log('Migrating passwords...')

  // Better Auth stores passwords in account table or user table
  // Passwords are already hashed, just copy them
  const { data: accounts, error } = await supabase
    .from('account')
    .select('userId, password')
    .neq('password', null)

  if (error) {
    console.error('Error fetching accounts:', error)
    return
  }

  // Update users with passwords
  for (const account of accounts) {
    await supabase
      .from('users')
      .update({ password: account.password })
      .eq('id', account.userId)
  }

  console.log(`✓ Migrated ${accounts.length} password hashes`)
}

async function migrateOAuthProviders() {
  console.log('Migrating OAuth providers...')

  // Get all accounts from Better Auth
  const { data: betterAuthAccounts, error } = await supabase
    .from('account')
    .select('userId, provider, providerAccountId, access_token, refresh_token')

  if (error) {
    console.error('Error fetching accounts:', error)
    return
  }

  // Insert into new schema
  const { error: insertError } = await supabase
    .from('user_oauth_providers')
    .upsert(
      betterAuthAccounts.map(acc => ({
        userId: acc.userId,
        provider: acc.provider,
        providerId: acc.providerAccountId,
        accessToken: acc.access_token,
        refreshToken: acc.refresh_token
      })),
      { onConflict: 'provider,providerId' }
    )

  if (insertError) {
    console.error('Error inserting OAuth providers:', insertError)
    return
  }

  console.log(`✓ Migrated ${betterAuthAccounts.length} OAuth accounts`)
}

async function main() {
  console.log('Starting migration from Better Auth to nuxt-auth-utils...\n')

  await migrateUsers()
  await migratePasswords()
  await migrateOAuthProviders()

  console.log('\n✓ Migration complete!')
}

main().catch(console.error)
```

#### Step 4.2: Run Migration
```bash
node scripts/migrate-from-better-auth.mjs
```

#### Step 4.3: Verify Migration
```sql
-- Check user counts
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as oauth_count FROM user_oauth_providers;

-- Verify password hashes
SELECT id, email, password IS NOT NULL as has_password FROM users LIMIT 5;

-- Verify OAuth data
SELECT provider, COUNT(*) FROM user_oauth_providers GROUP BY provider;
```

**Checkpoint**: All users migrated successfully with passwords and OAuth data intact.

---

### Day 5: Test Migrated Data

#### Step 5.1: Test Login with Migrated Users
```bash
# Test with migrated user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"existing_user@example.com","password":"theirPassword123"}'
```

#### Step 5.2: Create Data Validation Report
```typescript
// scripts/validate-migration.mjs
async function validateMigration() {
  // Check user counts match
  const betterAuthCount = await db.raw(
    'SELECT COUNT(*) FROM "user" WHERE "user"."deletedAt" IS NULL'
  )
  const newCount = await db.raw('SELECT COUNT(*) FROM "users"')

  console.log(`Better Auth users: ${betterAuthCount}`)
  console.log(`New schema users: ${newCount}`)

  if (betterAuthCount !== newCount) {
    console.warn('⚠️ User count mismatch!')
  }

  // Check password migration
  const withPasswords = await db.raw(
    'SELECT COUNT(*) FROM "users" WHERE "password" IS NOT NULL'
  )
  console.log(`Users with passwords: ${withPasswords}`)

  // Check OAuth migration
  const oauthAccounts = await db.raw(
    'SELECT COUNT(*) FROM "user_oauth_providers"'
  )
  console.log(`OAuth accounts: ${oauthAccounts}`)

  console.log('✓ Validation complete')
}
```

**Checkpoint**: All migrated data verified and tested.

---

## Phase 3: Frontend Migration (Days 6-10)

### Day 6-7: Update Composables

#### Step 6.1: Create useAuth Wrapper
```typescript
// app/composables/useAuth.ts
export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  const login = async (email: string, password: string) => {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })

    // Refresh session
    await fetch()

    return result
  }

  const signup = async (email: string, password: string, name?: string) => {
    const result = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: { email, password, name }
    })

    // Refresh session
    await fetch()

    return result
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
  }

  return {
    // State
    loggedIn,
    user,
    session,
    isReady: computed(() => !!session.value.user || !loggedIn.value),

    // Methods
    login,
    signup,
    logout,
    refresh: fetch
  }
}
```

#### Step 6.2: Update useRole Composable
```typescript
// app/composables/useRole.ts
export const useRole = () => {
  const { user } = useUserSession()

  const role = computed(() => user.value?.role || 'guest')

  const isAdmin = computed(() => role.value === 'admin')
  const isContributor = computed(() =>
    ['admin', 'contributor'].includes(role.value)
  )
  const isUser = computed(() =>
    ['admin', 'contributor', 'user'].includes(role.value)
  )

  const can = (requiredRole: string) => {
    const hierarchy = {
      guest: 0,
      user: 1,
      contributor: 2,
      admin: 3
    }

    return (hierarchy[role.value] || 0) >= (hierarchy[requiredRole] || 0)
  }

  return {
    role,
    isAdmin,
    isContributor,
    isUser,
    can
  }
}
```

#### Step 6.3: Update Login Component
```vue
<!-- app/pages/login.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: ['guest']
})

const { login } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await login(email.value, password.value)
    await router.push('/dashboard')
  } catch (e: any) {
    error.value = e.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function loginWithGithub() {
  const { openInPopup } = useUserSession()
  openInPopup('/auth/github', { width: 600, height: 700 })
}
</script>

<template>
  <div class="login-container">
    <h1>Login</h1>

    <form @submit.prevent="handleLogin">
      <div v-if="error" class="error">{{ error }}</div>

      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
        :disabled="loading"
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
        :disabled="loading"
      />

      <button :disabled="loading" type="submit">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>

    <div class="divider">OR</div>

    <button @click="loginWithGithub" class="oauth-button">
      Login with GitHub
    </button>

    <p>
      Don't have an account?
      <NuxtLink to="/signup">Sign up</NuxtLink>
    </p>
  </div>
</template>
```

#### Step 6.4: Update Dashboard Component
```vue
<!-- app/pages/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const { user, logout } = useAuth()
const { isAdmin } = useRole()
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <div class="user-info">
        <span>Welcome, {{ user.name || user.email }}</span>
        <button @click="logout">Logout</button>
      </div>
    </header>

    <main>
      <section>
        <h2>User Profile</h2>
        <p>Email: {{ user.email }}</p>
        <p>Name: {{ user.name }}</p>
        <p>Role: {{ user.role }}</p>
      </section>

      <section v-if="isAdmin">
        <h2>Admin Panel</h2>
        <NuxtLink to="/admin/users">Manage Users</NuxtLink>
      </section>
    </main>
  </div>
</template>
```

**Checkpoint**: Frontend composables updated and tested.

---

### Day 8-9: Update Middleware

#### Step 8.1: Update Auth Middleware
```typescript
// app/middleware/auth.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn, ready } = useUserSession()

  if (!ready.value) {
    return  // Still loading session
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
```

#### Step 8.2: Update Admin Middleware
```typescript
// app/middleware/admin.ts
export default defineRouteMiddleware((to, from) => {
  const { user, ready } = useUserSession()

  if (!ready.value) {
    return
  }

  if (!user.value || user.value.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }
})
```

#### Step 8.3: Update Guest Middleware
```typescript
// app/middleware/guest.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn, ready } = useUserSession()

  if (!ready.value) {
    return
  }

  if (loggedIn.value) {
    return navigateTo('/dashboard')
  }
})
```

**Checkpoint**: All middleware updated and tested.

---

### Day 10: Update Protected Routes

#### Step 10.1: Create Protected API Route
```typescript
// server/api/user/profile.get.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const user = await db.users.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true
    }
  })

  return user
})
```

#### Step 10.2: Create Admin Route
```typescript
// server/api/admin/users.get.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  // Check admin role
  if (session.user?.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }

  const users = await db.users.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return users
})
```

**Checkpoint**: All protected routes created and tested.

---

## Phase 4: Testing & Validation (Days 11-14)

### Day 11: Unit Tests

```typescript
// test/auth.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('Authentication', () => {
  describe('Login', () => {
    it('should login with valid credentials', async () => {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'Password123'
        }
      })

      expect(response.success).toBe(true)
      expect(response.user.email).toBe('test@example.com')
    })

    it('should reject invalid credentials', async () => {
      try {
        await $fetch('/api/auth/login', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'WrongPassword'
          }
        })
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('Signup', () => {
    it('should create new user', async () => {
      const response = await $fetch('/api/auth/signup', {
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          password: 'NewPassword123',
          name: 'New User'
        }
      })

      expect(response.success).toBe(true)
      expect(response.user.email).toBe('newuser@example.com')
    })

    it('should reject duplicate email', async () => {
      try {
        await $fetch('/api/auth/signup', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'Password123'
          }
        })
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.statusCode).toBe(409)
      }
    })
  })

  describe('Session', () => {
    it('should require authentication', async () => {
      try {
        await $fetch('/api/user/profile')
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })
})
```

### Day 12: Integration Tests

```typescript
// test/integration.spec.ts
describe('Auth Flow', () => {
  it('should complete signup and login flow', async () => {
    // Signup
    const signupRes = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'integration@example.com',
        password: 'IntegrationTest123',
        name: 'Integration User'
      }
    })

    expect(signupRes.success).toBe(true)

    // Logout
    await $fetch('/api/auth/logout', { method: 'POST' })

    // Login
    const loginRes = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'integration@example.com',
        password: 'IntegrationTest123'
      }
    })

    expect(loginRes.success).toBe(true)
    expect(loginRes.user.email).toBe('integration@example.com')
  })
})
```

**Checkpoint**: All tests passing.

---

### Day 13-14: Manual Testing Checklist

**Authentication Flow**:
- [ ] Signup with email/password
- [ ] Login with email/password
- [ ] Logout
- [ ] Session persists on page refresh
- [ ] Redirect to login when not authenticated
- [ ] Redirect to dashboard when already authenticated
- [ ] Logout clears session

**OAuth Flow** (GitHub example):
- [ ] Click "Login with GitHub" button
- [ ] Redirects to GitHub authorization
- [ ] Returns with session set
- [ ] User data populates correctly
- [ ] OAuth user can logout and login again

**Protected Routes**:
- [ ] /api/user/profile returns 401 when not authenticated
- [ ] /api/user/profile returns user data when authenticated
- [ ] /api/admin/users returns 403 for non-admin users
- [ ] /api/admin/users returns users for admin users

**Edge Cases**:
- [ ] Invalid email format
- [ ] Too short password
- [ ] Duplicate email on signup
- [ ] Session expiration (if configured)
- [ ] Browser cookie clearing

**Checkpoint**: Manual testing complete and documented.

---

## Phase 5: Feature Flag Cutover (Day 15)

### Step 15.1: Create Feature Flag
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      useNuxtAuthUtils: process.env.USE_NUXT_AUTH_UTILS === 'true'
    }
  }
})
```

### Step 15.2: Add to .env
```bash
# .env
USE_NUXT_AUTH_UTILS=true
```

### Step 15.3: Toggle Components (if needed)
```vue
<script setup>
const config = useRuntimeConfig()
const useNewAuth = config.public.useNuxtAuthUtils

// Switch between old and new composables if needed
const auth = useNewAuth ? useAuth() : useOldAuth()
</script>
```

**Checkpoint**: Feature flag in place, can toggle between auth systems.

---

## Phase 6: Cleanup (Days 16-21)

### Day 16: Remove Better Auth Dependencies

```bash
# Remove packages
npm uninstall better-auth @better-auth/core @better-auth/oauth2

# Remove from nuxt.config.ts
# - Remove better-auth module import
# - Remove better-auth configuration
```

### Day 17: Clean Up Better Auth Tables

```sql
-- After verifying all data migrated and in production for a few days
-- DROP TABLE IF EXISTS verification;
-- DROP TABLE IF EXISTS account;
-- DROP TABLE IF EXISTS session;
-- Keep "user" table or rename if conflict

-- Optional: Drop if you've migrated all to "users" table
-- DROP TABLE IF EXISTS "user";
```

### Day 18: Remove Temp Migration Scripts

```bash
rm scripts/migrate-from-better-auth.mjs
rm scripts/validate-migration.mjs
```

### Day 19-21: Documentation & Monitoring

#### Update CLAUDE.md
```markdown
## Authentication System (nuxt-auth-utils)
- **Configuration**: `nuxt.config.ts` (auth section)
- **Session Management**: Encrypted cookies
- **Client**: `app/composables/useAuth.ts`
- **Composable**: `app/composables/useAuth.ts`
- **Features**:
  - Email/password authentication
  - OAuth providers: GitHub, Google, Apple
  - Session management with httpOnly cookies
  - Scrypt password hashing
  - WebAuthn support (passkeys)
```

#### Monitor in Production
- [ ] Check error logs for auth-related errors
- [ ] Monitor login success rates
- [ ] Verify OAuth callback success
- [ ] Check session expiration issues
- [ ] Monitor password reset requests (if applicable)

**Checkpoint**: All cleanup complete, documentation updated.

---

## Rollback Plan

If issues arise during migration:

### Quick Rollback Steps

1. **Toggle Feature Flag**
   ```bash
   # Set to false to use old auth
   USE_NUXT_AUTH_UTILS=false
   ```

2. **Keep Both Systems Running**
   - Both authentication systems can run in parallel
   - Session data is separate (cookies vs database)
   - No conflicts

3. **Restore Better Auth**
   ```bash
   npm install better-auth
   # Restore from git
   git restore nuxt.config.ts
   ```

4. **Database Rollback**
   ```bash
   # If database modified:
   supabase db reset  # Reset to last migration
   # Or restore from backup
   ```

---

## Success Criteria

Migration is complete when:

- ✅ All users migrated successfully
- ✅ All new auth routes working (signup, login, logout, OAuth)
- ✅ Frontend composables updated
- ✅ All middleware updated
- ✅ All tests passing
- ✅ Manual testing checklist completed
- ✅ Better Auth removed from codebase
- ✅ Documentation updated
- ✅ Production monitoring confirmed
- ✅ No authentication-related errors for 1 week

---

## File Structure After Migration

```
project/
├── app/
│   ├── composables/
│   │   ├── useAuth.ts          (NEW - wrapper)
│   │   └── useRole.ts          (UPDATED)
│   ├── middleware/
│   │   ├── auth.ts             (UPDATED)
│   │   ├── admin.ts            (UPDATED)
│   │   └── guest.ts            (UPDATED)
│   ├── pages/
│   │   ├── login.vue           (UPDATED)
│   │   ├── signup.vue          (UPDATED)
│   │   └── dashboard.vue       (UPDATED)
│   └── layouts/                (UNCHANGED)
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.post.ts   (NEW)
│   │   │   ├── signup.post.ts  (NEW)
│   │   │   └── logout.post.ts  (NEW)
│   │   ├── user/
│   │   │   └── profile.get.ts  (NEW)
│   │   └── admin/
│   │       └── users.get.ts    (NEW)
│   ├── routes/
│   │   └── auth/
│   │       ├── github.get.ts   (NEW)
│   │       ├── google.get.ts   (NEW)
│   │       └── apple.get.ts    (NEW)
│   └── plugins/
│       └── session.ts          (NEW)
├── nuxt.config.ts              (UPDATED)
├── .env                        (UPDATED)
└── NUXT_AUTH_UTILS_RESEARCH.md (NEW)
```

---

## Common Issues & Solutions

### Issue: "Session not persisting"
**Solution**: Ensure NUXT_SESSION_PASSWORD is set and at least 32 characters

### Issue: "OAuth redirect not working"
**Solution**: Check OAuth provider credentials and redirect URL settings

### Issue: "Password verification failing"
**Solution**: Ensure passwords were properly migrated from Better Auth; verify with test user

### Issue: "Cookie size exceeded"
**Solution**: Reduce session data size; move large fields to secure object or database

### Issue: "Role-based access not working"
**Solution**: Ensure `role` field is being set in session and used in middleware

---

## References

- nuxt-auth-utils documentation: `/Volumes/ExternalMac/Dev/starter-nuxt/NUXT_AUTH_UTILS_RESEARCH.md`
- Nuxt server routes: https://nuxt.com/docs/guide/directory-structure/server
- Nitro plugins: https://nitro.unjs.io/
- Session management: https://nuxt.com/docs/4.x/guide/recipes/sessions-and-authentication

