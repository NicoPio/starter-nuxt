# Nuxt Auth Utils: Comprehensive Migration Research

## Executive Summary

**nuxt-auth-utils** is a production-ready authentication module for Nuxt 3/4 that manages secure session handling through encrypted cookies, provides 40+ OAuth provider integrations, supports password hashing with scrypt, and includes WebAuthn (passkey) authentication. Unlike Better Auth, it doesn't require database session storage and is optimized for serverless/edge deployments.

**Key Difference from Better Auth**: Session data is stored in encrypted cookies rather than database, eliminating session table management.

---

## 1. Core Architecture & Philosophy

### Design Principles
- **Session Storage**: Encrypted cookies (no database required for sessions)
- **Security**: Sealed cookies with scrypt-based password hashing
- **Hybrid Rendering Support**: Works with SSR, CSR, SWR, and prerendering
- **Serverless-Ready**: No session store dependency
- **Tree-Shakeable**: Only imported OAuth providers included in bundle

### Core Concepts
- **Sealed Cookies**: Session data encrypted using `NUXT_SESSION_PASSWORD` (minimum 32 characters)
- **Cookie Size Constraint**: 4096-byte limit for encrypted session data
- **Minimal Dependencies**: Uses UnJS libraries (nitro, h3, etc.)
- **Type-Safe**: Full TypeScript support with composable augmentation

---

## 2. Session Management Patterns

### Architecture Overview

```
┌─────────────────────────────────────────┐
│        Client (Vue Component)            │
│  useUserSession() composable access      │
└──────────────┬──────────────────────────┘
               │
               ├─→ /api/_auth/session (GET)
               │   └─→ Fetch encrypted cookie
               │
               └─→ /api/auth/logout (POST)
                   └─→ Clear encrypted cookie

┌──────────────────────────────────────────┐
│    Server-Side API Routes                │
│  ├─ /api/login.post.ts                   │
│  ├─ /api/auth/github.get.ts (OAuth)      │
│  └─ /api/logout.post.ts                  │
└──────────────────────────────────────────┘
                │
         ┌──────▼──────┐
         │  Encrypted  │
         │   Cookie    │
         │  (4096B)    │
         └─────────────┘
```

### Session Data Structure

```typescript
interface UserSession {
  user?: {
    id: string
    email?: string
    [key: string]: any  // Custom fields
  }
  secure?: {
    // Server-only data (not sent to client)
    apiToken?: string
    refreshToken?: string
  }
  loggedInAt?: number
  [key: string]: any  // Custom fields
}
```

### Key Constraints

1. **4096-byte Cookie Limit**: Store minimal essential data
   - ✅ User ID, email, basic metadata
   - ❌ Large objects, full user profiles, rich media

2. **Secure Field Isolation**: Data in `secure` object is server-only
   - Accessible in server routes via `session.secure`
   - NOT accessible in client components
   - Perfect for API tokens, sensitive credentials

3. **Session Persistence**: Default maxAge is 7 days (configurable)

### Server-Side Session Utilities

#### Setting Session (Login)
```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  // Validate credentials
  const user = await db.getUserByEmail(email)
  if (!user || !(await verifyPassword(user.password, password))) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  // Set encrypted session cookie
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    secure: {
      // These are ONLY accessible on server
      apiToken: user.apiToken
    },
    loggedInAt: Date.now()
  })

  return { success: true }
})
```

#### Getting Session (Protected Routes)
```typescript
// server/api/profile.get.ts
export default defineEventHandler(async (event) => {
  // Throws 401 if not authenticated
  const session = await requireUserSession(event)

  // Access user data
  const userId = session.user.id
  const apiToken = session.secure?.apiToken  // Server-only

  return {
    user: session.user,
    lastLogin: session.loggedInAt
  }
})
```

#### Clearing Session (Logout)
```typescript
// server/api/auth/logout.post.ts
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { success: true }
})
```

#### Session Hooks (Middleware-like)
```typescript
// server/plugins/session.ts
export default defineNitroPlugin(() => {
  // Extend session on fetch (e.g., from /api/_auth/session)
  sessionHooks.hook('fetch', async (session, event) => {
    if (session.user?.id) {
      // Validate user still exists & is active
      const user = await db.getUserById(session.user.id)

      if (!user || user.banned) {
        throw createError({
          statusCode: 401,
          message: 'Invalid session'
        })
      }

      // Enrich session with additional data
      session.user.roles = user.roles
      session.user.plan = user.subscriptionPlan
    }
  })

  // Called on logout
  sessionHooks.hook('clear', async (session, event) => {
    if (session.user?.id) {
      await db.insertAuditLog({
        userId: session.user.id,
        action: 'logout',
        timestamp: Date.now()
      })
    }
  })
})
```

### Client-Side Session Management

#### useUserSession Composable
```vue
<script setup>
const {
  loggedIn,      // ComputedRef<boolean>
  ready,         // ComputedRef<boolean>
  user,          // ComputedRef<User | null>
  session,       // Ref<UserSession>
  fetch,         // () => Promise<void>
  clear,         // () => Promise<void>
  openInPopup    // (route, size?) => void
} = useUserSession()

// Refresh session from server
async function refreshSession() {
  await fetch()
}

// Logout
async function logout() {
  await clear()
  navigateTo('/login')
}

// OAuth in popup (auto-closes on success)
function loginWithGithub() {
  openInPopup('/auth/github', { width: 600, height: 700 })
}
</script>

<template>
  <div v-if="!ready" class="loading">Loading session...</div>
  <div v-else-if="loggedIn">
    <h1>Welcome {{ user.email }}!</h1>
    <p>Logged in at {{ new Date(session.loggedInAt).toLocaleString() }}</p>
    <button @click="logout">Logout</button>
  </div>
  <div v-else>
    <p>Not logged in</p>
    <button @click="loginWithGithub">Login with GitHub</button>
  </div>
</template>
```

#### AuthState Component (for Hybrid Rendering)
```vue
<!-- Handles prerendered & cached pages -->
<template>
  <header>
    <AuthState v-slot="{ loggedIn, clear }">
      <button v-if="loggedIn" @click="clear">Logout</button>
      <NuxtLink v-else to="/login">Login</NuxtLink>
    </AuthState>

    <!-- Show loading state during hydration -->
    <template #placeholder>
      <button disabled>Loading...</button>
    </template>
  </header>
</template>
```

#### Middleware Protection
```typescript
// app/middleware/auth.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
```

---

## 3. OAuth Provider Integration

### Supported Providers (40+)

**Social**: Apple, Atlassian, Auth0, Authentik, Azure B2C, Bluesky, Discord, Dropbox, Facebook, GitHub, GitLab, Gitea, Google, Instagram, Kick, Line, LinkedIn, Microsoft, PayPal, Slack, Spotify, Steam, Strava, TikTok, Twitch, X (Twitter)

**Enterprise**: AWS Cognito, Azure B2C, Okta, Ory, Salesforce, Zitadel, Keycloak

**Other**: Battle.net, Hubspot, Heroku, Hugging Face, LiveChat, Linear, Shopify Customer, Seznam, VK, WorkOS, XSUAA, Yandex, AT Protocol

### OAuth Handler Pattern

```typescript
// server/routes/auth/[provider].get.ts
export default defineOAuth<Provider>EventHandler({
  config: {
    // Provider-specific options
    scope: ['email', 'profile'],
    authorizationParams: {}  // Custom auth params
  },
  async onSuccess(event, { user, tokens }) {
    // user: OAuth provider user data
    // tokens: { access_token, refresh_token, expires_at }

    // Look up or create user in database
    let dbUser = await db.findUserByEmail(user.email)

    if (!dbUser) {
      dbUser = await db.createUser({
        email: user.email,
        name: user.name,
        avatar: user.picture || user.avatar_url,
        providerId: user.id,  // Track OAuth provider ID
        provider: 'github'    // Track provider name
      })
    }

    // Set session
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name
      },
      secure: {
        // Store tokens server-side for API calls
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      },
      loggedInAt: Date.now()
    })

    // Redirect on success
    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error(`${provider} OAuth error:`, error)
    return sendRedirect(event, '/login?error=oauth_failed')
  }
})
```

### GitHub OAuth Example
```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
    scope: ['user:email', 'read:user', 'notifications']
  },
  async onSuccess(event, { user, tokens }) {
    const dbUser = await db.users.upsert({
      where: { githubId: user.id },
      create: {
        email: user.email,
        githubId: user.id,
        username: user.login,
        avatar: user.avatar_url
      },
      update: {
        avatar: user.avatar_url,
        lastLogin: new Date()
      }
    })

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/dashboard')
  }
})
```

### Google OAuth Example
```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile', 'openid'],
    authorizationParams: {
      access_type: 'offline',  // Get refresh token
      prompt: 'consent'        // Force consent
    }
  },
  async onSuccess(event, { user, tokens }) {
    const dbUser = await db.users.upsert({
      where: { googleId: user.sub },
      create: {
        email: user.email,
        googleId: user.sub,
        name: user.name,
        picture: user.picture
      },
      update: { lastLogin: new Date() }
    })

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email
      },
      secure: {
        // Store tokens for future API calls
        refreshToken: tokens.refresh_token
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
```

### Configuration

```bash
# .env
NUXT_OAUTH_GITHUB_CLIENT_ID=your_github_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret
NUXT_OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
NUXT_OAUTH_APPLE_CLIENT_ID=your_apple_client_id
NUXT_OAUTH_APPLE_TEAM_ID=your_apple_team_id
NUXT_OAUTH_APPLE_KEY_ID=your_apple_key_id
NUXT_OAUTH_APPLE_PRIVATE_KEY=your_apple_private_key
```

---

## 4. Password-Based Authentication

### Password Hashing with Scrypt

```typescript
import { hashPassword, verifyPassword, passwordNeedsRehash } from '#auth-utils'

// Hash password on signup
const hashedPassword = await hashPassword(plainTextPassword)

// Verify password on login
const isValid = await verifyPassword(hashedPassword, plainTextPassword)

// Check if hash is outdated (e.g., after config changes)
if (passwordNeedsRehash(hashedPassword)) {
  // Rehash on next login
  const newHash = await hashPassword(plainTextPassword)
}
```

### Signup Flow
```typescript
// server/api/auth/signup.post.ts
export default defineEventHandler(async (event) => {
  const { email, password, name } = await readBody(event)

  // Validate input
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters'
    })
  }

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
      name,
      password: hashedPassword
    }
  })

  // Set session (auto sign-in)
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    loggedInAt: Date.now()
  })

  return { success: true }
})
```

### Login Flow
```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

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
      name: user.name
    },
    loggedInAt: Date.now()
  })

  return { success: true }
})
```

### Configuration
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],
  auth: {
    hash: {
      scrypt: {
        cost: 16384,           // CPU cost factor
        blockSize: 8,          // Memory cost
        parallelization: 1     // Parallelization factor
      }
    }
  }
})
```

---

## 5. WebAuthn (Passkey) Authentication

### Requirements

```bash
npm install @simplewebauthn/server@11 @simplewebauthn/browser@11
```

### Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  publicKey TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  backedUp BOOLEAN NOT NULL DEFAULT FALSE,
  transports TEXT NOT NULL,  -- JSON array: ["usb", "nfc", "ble", "internal"]
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, id)
);

-- Optional: For challenge-based security
CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'register' | 'authenticate'
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Registration Flow

```typescript
// server/api/webauthn/register.post.ts
export default defineWebAuthnRegisterEventHandler({
  // Validate user input
  async validateUser(userBody, event) {
    return z.object({
      userName: z.string().email()
    }).parse(userBody)
  },

  // Return existing credentials to prevent duplicate registration
  async excludeCredentials(event, userName) {
    const user = await db.users.findUnique({
      where: { email: userName }
    })

    if (!user) {
      return []
    }

    const credentials = await db.credentials.findMany({
      where: { userId: user.id },
      select: { id: true }
    })

    return credentials.map(c => ({ id: c.id }))
  },

  // Store new credential
  async onSuccess(event, { credential, user: { userName } }) {
    // Find or create user
    let dbUser = await db.users.findUnique({
      where: { email: userName }
    })

    if (!dbUser) {
      dbUser = await db.users.create({
        data: { email: userName }
      })
    }

    // Store credential
    await db.credentials.create({
      data: {
        id: credential.id,
        userId: dbUser.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp,
        transports: JSON.stringify(credential.transports)
      }
    })

    // Set session
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email
      },
      loggedInAt: Date.now()
    })
  }
})
```

### Authentication Flow

```typescript
// server/api/webauthn/authenticate.post.ts
export default defineWebAuthnAuthenticateEventHandler({
  // Return user's credentials for browser to select
  async allowCredentials(event, userName) {
    const user = await db.users.findUnique({
      where: { email: userName },
      include: { credentials: true }
    })

    if (!user?.credentials.length) {
      throw createError({
        statusCode: 400,
        message: 'No passkeys registered'
      })
    }

    return user.credentials.map(c => ({ id: c.id }))
  },

  // Retrieve credential for verification
  async getCredential(event, credentialId) {
    const credential = await db.credentials.findUnique({
      where: { id: credentialId }
    })

    if (!credential) {
      throw createError({
        statusCode: 400,
        message: 'Credential not found'
      })
    }

    return {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: JSON.parse(credential.transports)
    }
  },

  // Handle successful authentication
  async onSuccess(event, { credential, authenticationInfo }) {
    // Get user
    const cred = await db.credentials.findUnique({
      where: { id: credential.id },
      include: { user: true }
    })

    if (!cred) {
      throw createError({ statusCode: 400, message: 'Invalid credential' })
    }

    // Update counter (prevents cloning attacks)
    await db.credentials.update({
      where: { id: credential.id },
      data: { counter: authenticationInfo.newCounter }
    })

    // Set session
    await setUserSession(event, {
      user: {
        id: cred.user.id,
        email: cred.user.email
      },
      loggedInAt: Date.now()
    })
  }
})
```

### Frontend Usage

```vue
<script setup lang="ts">
const { register, authenticate } = useWebAuthn({
  registerEndpoint: '/api/webauthn/register',
  authenticateEndpoint: '/api/webauthn/authenticate'
})

const { fetch: fetchSession } = useUserSession()

const userName = ref('')
const error = ref('')

async function handleRegister() {
  try {
    await register({ userName: userName.value })
    await fetchSession()  // Refresh session
    navigateTo('/dashboard')
  } catch (e) {
    error.value = e.message
  }
}

async function handleAuthenticate() {
  try {
    await authenticate(userName.value)
    await fetchSession()
    navigateTo('/dashboard')
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div>
    <h2>Passkey Authentication</h2>

    <div v-if="error" class="error">{{ error }}</div>

    <form @submit.prevent="handleRegister">
      <input v-model="userName" type="email" placeholder="Email" required />
      <button type="submit">Register Passkey</button>
    </form>

    <form @submit.prevent="handleAuthenticate">
      <input v-model="userName" type="email" placeholder="Email" required />
      <button type="submit">Login with Passkey</button>
    </form>
  </div>
</template>
```

---

## 6. Database Requirements & Schema

### Key Principle
**nuxt-auth-utils does NOT store sessions in database**. Sessions are encrypted in cookies. Database is only needed for:
- User data (email, name, etc.)
- OAuth provider mappings (githubId, googleId)
- Password hashes
- WebAuthn credentials
- Custom user data

### Minimal User Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT,                -- NULL if using OAuth only
  avatar TEXT,
  role TEXT DEFAULT 'user',     -- user, contributor, admin
  banned BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth provider mappings
CREATE TABLE user_oauth_providers (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,        -- 'github', 'google', 'apple', etc.
  providerId TEXT NOT NULL,      -- Provider's user ID
  email TEXT,                    -- Provider's email (may differ from users.email)
  username TEXT,                 -- Provider's username (GitHub login, etc.)
  avatar TEXT,
  accessToken TEXT,              -- For API calls
  refreshToken TEXT,             -- For token refresh
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, providerId)
);

-- WebAuthn credentials (if using passkeys)
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  publicKey TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  backedUp BOOLEAN DEFAULT FALSE,
  transports TEXT NOT NULL,     -- JSON: ["usb", "nfc", "ble", "internal"]
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Audit log for security events
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id),
  action TEXT NOT NULL,          -- 'login', 'logout', 'password_change', etc.
  provider TEXT,                 -- OAuth provider if applicable
  ip_address TEXT,
  user_agent TEXT,
  status TEXT,                   -- 'success', 'failed'
  reason TEXT,                   -- Failure reason if applicable
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### No Session Table Needed

Unlike Better Auth which has `session` and `account` tables, nuxt-auth-utils needs:
- ✅ `users` table
- ✅ `user_oauth_providers` table (if using OAuth)
- ✅ `credentials` table (if using WebAuthn)
- ❌ NO session table (handled by encrypted cookies)

---

## 7. Migration Strategy from Better Auth

### Phase 1: Parallel Setup (Days 1-3)

**Goal**: Run nuxt-auth-utils alongside Better Auth without breaking existing sessions.

1. Install nuxt-auth-utils
```bash
npm install nuxt-auth-utils
```

2. Configure NUXT_SESSION_PASSWORD
```env
# .env
NUXT_SESSION_PASSWORD=generate-32-character-minimum-secure-password-here

# Keep existing Better Auth config
BETTER_AUTH_SECRET=...
DATABASE_URL=...
```

3. Create new API routes for nuxt-auth-utils
```typescript
// server/routes/auth/github.get.ts (new)
// server/routes/auth/google.get.ts (new)
// server/api/auth/login.post.ts (new)
// server/api/auth/signup.post.ts (new)
// server/api/auth/logout.post.ts (new)
```

4. Keep existing Better Auth routes intact
```typescript
// These continue to work
// /api/auth/* (Better Auth routes)
```

### Phase 2: Data Migration (Days 4-5)

**Goal**: Migrate user data from Better Auth tables to new schema.

```typescript
// scripts/migrate-from-better-auth.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

async function migrateUsers() {
  // Get all users from Better Auth table
  const { data: betterAuthUsers } = await supabase
    .from('user')
    .select('id, email, name, role')

  // Insert into new users table
  for (const user of betterAuthUsers) {
    await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      })
  }

  console.log(`Migrated ${betterAuthUsers.length} users`)
}

async function migrateOAuthProviders() {
  // Get all accounts from Better Auth
  const { data: betterAuthAccounts } = await supabase
    .from('account')
    .select('userId, provider, providerAccountId, access_token, refresh_token')

  // Map to new schema
  for (const account of betterAuthAccounts) {
    await supabase
      .from('user_oauth_providers')
      .insert({
        userId: account.userId,
        provider: account.provider,
        providerId: account.providerAccountId,
        accessToken: account.access_token,
        refreshToken: account.refresh_token
      })
  }

  console.log(`Migrated ${betterAuthAccounts.length} OAuth accounts`)
}

async function migratePasswords() {
  // Better Auth stores passwords in 'account' table or separate field
  const { data: betterAuthUsers } = await supabase
    .from('user')
    .select('id, password')
    .neq('password', null)

  // Passwords are already hashed, just copy them
  for (const user of betterAuthUsers) {
    await supabase
      .from('users')
      .update({ password: user.password })
      .eq('id', user.id)
  }

  console.log(`Migrated ${betterAuthUsers.length} password hashes`)
}

await migrateUsers()
await migrateOAuthProviders()
await migratePasswords()
```

### Phase 3: Component & Composable Migration (Days 6-10)

**Goal**: Migrate frontend code from Better Auth composables to nuxt-auth-utils.

#### Before (Better Auth)
```vue
<script setup>
import { useAuth } from '#auth'

const { status, data, signOut } = useAuth()
</script>

<template>
  <div v-if="status === 'authenticated'">
    <p>Hello {{ data.user.email }}</p>
    <button @click="signOut">Logout</button>
  </div>
</template>
```

#### After (nuxt-auth-utils)
```vue
<script setup>
const { loggedIn, user, clear } = useUserSession()
</script>

<template>
  <div v-if="loggedIn">
    <p>Hello {{ user.email }}</p>
    <button @click="clear">Logout</button>
  </div>
</template>
```

#### Migration Mapping

| Better Auth | nuxt-auth-utils | Notes |
|-----------|------------------|-------|
| `useAuth()` | `useUserSession()` | Composable name changed |
| `status === 'authenticated'` | `loggedIn` | Boolean instead of string |
| `data.user` | `user` | Direct property access |
| `signOut()` | `clear()` | Method name changed |
| `useSession()` | `useUserSession()` | Same composable |
| `data.session` | `session` | Direct access |
| N/A | `openInPopup()` | New feature for OAuth popups |

### Phase 4: Route Migration (Days 11-15)

**Goal**: Replace Better Auth API routes with nuxt-auth-utils.

#### Login Endpoint

**Better Auth**:
```typescript
// Handled automatically by Better Auth
// POST /api/auth/signin/credentials
```

**nuxt-auth-utils**:
```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  const user = await db.users.findUnique({
    where: { email }
  })

  if (!user || !(await verifyPassword(user.password, password))) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email
    },
    loggedInAt: Date.now()
  })

  return { success: true }
})
```

#### OAuth Endpoints

**Better Auth**:
```typescript
// Handled by Better Auth
// GET /api/auth/signin/github (automatic redirect)
```

**nuxt-auth-utils**:
```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true
  },
  async onSuccess(event, { user, tokens }) {
    // Handle OAuth user
    const dbUser = await db.users.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        avatar: user.avatar_url
      },
      update: { lastLogin: new Date() }
    })

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/dashboard')
  }
})
```

#### Logout Endpoint

**Better Auth**:
```typescript
// POST /api/auth/signout
```

**nuxt-auth-utils**:
```typescript
// server/api/auth/logout.post.ts
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { success: true }
})
```

### Phase 5: Testing & Cutover (Days 16-21)

**Parallel Testing**: Test new routes alongside existing Better Auth
```typescript
// app/middleware/test-auth.ts (optional)
// Routes can handle both old and new auth
```

**Feature Flags** (optional for smooth transition):
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

**Cutover Checklist**:
- [ ] All users migrated to new schema
- [ ] All routes tested in parallel
- [ ] All composables updated in frontend
- [ ] Passwords migrated and working
- [ ] OAuth providers tested
- [ ] Session cookies working
- [ ] Logout functionality working
- [ ] Admin role-based access working
- [ ] All tests passing

### Phase 6: Cleanup (Day 22+)

**After Migration Complete**:
1. Remove Better Auth dependencies
```bash
npm uninstall better-auth @better-auth/core @better-auth/oauth2
```

2. Remove Better Auth from nuxt.config.ts

3. Remove Better Auth tables from database
```sql
-- After verifying all data migrated
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
-- Keep user table or rename to users if needed
```

4. Clean up temporary migration scripts

---

## 8. Integration Patterns with Nuxt 3/4

### File Structure

```
server/
├── api/
│   ├── auth/
│   │   ├── login.post.ts        # Email/password login
│   │   ├── signup.post.ts       # Email/password signup
│   │   ├── logout.post.ts       # Logout
│   │   ├── refresh.post.ts      # Refresh session
│   │   └── me.get.ts            # Current user
│   ├── profile.get.ts           # Protected route
│   └── admin/
│       └── users.get.ts         # Admin-only route
├── plugins/
│   └── session.ts               # Session hooks
└── routes/
    └── auth/
        ├── github.get.ts        # OAuth handler
        ├── google.get.ts        # OAuth handler
        └── apple.get.ts         # OAuth handler

app/
├── composables/
│   ├── useAuth.ts               # Auth wrapper (optional)
│   └── useRole.ts               # Role checking
├── middleware/
│   ├── auth.ts                  # Require auth
│   ├── admin.ts                 # Require admin
│   └── guest.ts                 # Require NOT logged in
└── pages/
    ├── login.vue
    ├── signup.vue
    ├── dashboard.vue
    └── admin/
        └── users.vue
```

### Middleware Examples

```typescript
// app/middleware/auth.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})

// app/middleware/admin.ts
export default defineRouteMiddleware(async (to, from) => {
  const { user } = useUserSession()

  if (!user.value || user.value.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }
})

// app/middleware/guest.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()

  if (loggedIn.value) {
    return navigateTo('/dashboard')
  }
})
```

### Composable Wrapper (Optional)

Create a wrapper composable for consistency:
```typescript
// app/composables/useAuth.ts
export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  return {
    loggedIn,
    user,
    session,
    login: (email: string, password: string) => {
      // Call POST /api/auth/login
      return $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      }).then(() => fetch())
    },
    signup: (email: string, password: string, name: string) => {
      return $fetch('/api/auth/signup', {
        method: 'POST',
        body: { email, password, name }
      }).then(() => fetch())
    },
    logout: clear,
    refresh: fetch
  }
}
```

### Error Handling

```typescript
// server/plugins/errors.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error:log', (event, error) => {
    if (error.statusCode === 401) {
      // Session expired, client should redirect to login
    }
  })
})

// app/plugins/auth-errors.client.ts
export default defineNuxtPlugin(() => {
  const { clear } = useUserSession()

  // Handle 401 responses globally
  const nuxtApp = useNuxtApp()
  nuxtApp.$fetch.create({
    onResponse({ response }) {
      if (response.status === 401) {
        // Session expired
        clear()
        navigateTo('/login')
      }
    }
  })
})
```

---

## 9. Session Persistence & Security Best Practices

### Cookie Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],

  runtimeConfig: {
    session: {
      // Session duration (default: 7 days)
      maxAge: 60 * 60 * 24 * 7,

      // Cookie name
      name: 'nuxt-session',

      // Cookie options
      cookie: {
        // Prevent JavaScript access
        httpOnly: true,

        // HTTPS only in production
        secure: process.env.NODE_ENV === 'production',

        // SameSite protection
        sameSite: 'lax'
      }
    }
  },

  auth: {
    // Session loading strategy
    loadStrategy: 'ssr',  // 'ssr' | 'client-only'

    // Hash configuration for passwords
    hash: {
      scrypt: {
        cost: 16384,
        blockSize: 8,
        parallelization: 1
      }
    }
  }
})
```

### Session Password Management

```bash
# Generate strong session password (32+ characters)
# Use a cryptographically secure random generator
# Example with Node.js:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

NUXT_SESSION_PASSWORD=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Secure Session Data Storage

```typescript
// ✅ DO: Store minimal data
await setUserSession(event, {
  user: {
    id: '123',
    email: 'user@example.com'
  },
  loggedInAt: Date.now()
})

// ❌ DON'T: Store large objects or sensitive data
await setUserSession(event, {
  user: {
    id: '123',
    profile: { /* large object */ },
    subscriptionDetails: { /* sensitive */ }
  }
})
```

### Use Secure Field for Sensitive Data

```typescript
// ✅ DO: Store sensitive data in secure field (server-only)
await setUserSession(event, {
  user: {
    id: '123',
    email: 'user@example.com'
  },
  secure: {
    // Only accessible on server-side routes
    apiToken: 'secret_token_xyz',
    refreshToken: 'refresh_token_xyz'
  }
})

// Access on server
const session = await getUserSession(event)
const token = session.secure?.apiToken  // Works on server
```

### Validate Session on Each Request

```typescript
// server/plugins/session.ts
export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session, event) => {
    if (!session.user?.id) {
      return
    }

    // Validate user still exists and is active
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
        message: 'User account suspended'
      })
    }

    // Update session with fresh user data
    session.user = {
      id: user.id,
      email: user.email,
      role: user.role
    }
  })
})
```

### CSRF Protection

```typescript
// nuxt-auth-utils handles CSRF for same-site requests via SameSite cookies
// For cross-origin requests, implement CSRF tokens:

// server/middleware/csrf.ts
export default defineEventHandler(async (event) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.req.method)) {
    const token = getCookie(event, 'csrf-token')
    const headerToken = getHeader(event, 'x-csrf-token')

    if (!token || token !== headerToken) {
      throw createError({
        statusCode: 403,
        message: 'CSRF token invalid'
      })
    }
  }
})
```

### Password Security

```typescript
// Enforce minimum password requirements
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/  // Mix of cases + number

// On signup/password change
if (password.length < PASSWORD_MIN_LENGTH) {
  throw createError({
    statusCode: 400,
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  })
}

if (!PASSWORD_REGEX.test(password)) {
  throw createError({
    statusCode: 400,
    message: 'Password must contain uppercase, lowercase, and numbers'
  })
}

// Hash with scrypt
const hashed = await hashPassword(password)
```

### Rate Limiting

```typescript
// server/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m')
})

export default defineEventHandler(async (event) => {
  // Rate limit login attempts
  if (event.node.req.url?.includes('/api/auth/login')) {
    const identifier = getClientIP(event)

    try {
      const { success } = await ratelimit.limit(identifier)
      if (!success) {
        throw createError({
          statusCode: 429,
          message: 'Too many login attempts'
        })
      }
    } catch (e) {
      console.error('Rate limit check failed:', e)
    }
  }
})
```

---

## 10. Comparison: Better Auth vs nuxt-auth-utils

| Aspect | Better Auth | nuxt-auth-utils |
|--------|------------|-----------------|
| **Session Storage** | Database tables | Encrypted cookies |
| **Database Required** | Yes (session, account) | No (optional, for user data) |
| **Setup Complexity** | Medium (requires DB setup) | Low (encrypted cookie) |
| **OAuth Providers** | 50+ | 40+ |
| **Password Hashing** | Built-in | Built-in (scrypt) |
| **WebAuthn** | No | Yes |
| **Bundle Size** | Medium | Small (tree-shakeable) |
| **Hybrid Rendering** | Partial | Full support |
| **Serverless-Friendly** | Less (needs session store) | Yes (cookie-based) |
| **Role-Based Access** | Manual | Manual |
| **Email Verification** | Built-in options | Manual implementation |
| **Token Refresh** | Built-in | Manual via secure field |
| **Learning Curve** | Steep | Moderate |
| **TypeScript Support** | Good | Excellent |

---

## 11. Quick Start Template

### Installation
```bash
npm install nuxt-auth-utils
```

### Configuration
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],

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
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      }
    },
    oauth: {
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET
      }
    }
  }
})
```

### Login Route
```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  const user = await db.users.findUnique({ where: { email } })

  if (!user || !(await verifyPassword(user.password, password))) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  await setUserSession(event, {
    user: { id: user.id, email: user.email },
    loggedInAt: Date.now()
  })

  return { success: true }
})
```

### Protected Route
```typescript
// server/api/profile.get.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return { user: session.user }
})
```

### Login Component
```vue
<script setup>
const { loggedIn, user, clear } = useUserSession()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    navigateTo('/dashboard')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <form @submit.prevent="login" v-if="!loggedIn">
      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />
      <button :disabled="loading">Login</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <div v-else>
      <p>Welcome {{ user.email }}</p>
      <button @click="clear">Logout</button>
    </div>
  </div>
</template>
```

---

## Key Takeaways for Migration

1. **No Session Table**: Remove database session management, use encrypted cookies instead

2. **Simpler Schema**: Only need users, oauth_providers, and credentials tables

3. **Secure Field**: Use for sensitive data (tokens) that should stay server-only

4. **Cookie Size**: 4096-byte limit - store minimal user data

5. **Session Hooks**: Extend functionality via Nitro plugins instead of middleware

6. **OAuth is Declarative**: Define handlers with `defineOAuth<Provider>EventHandler()`

7. **WebAuthn Ready**: Full passkey support with database credential storage

8. **Hybrid Rendering**: Works perfectly with prerendering & caching

9. **Tree-Shakeable**: Only included OAuth providers are bundled

10. **Type-Safe**: Full TypeScript support with composable augmentation

