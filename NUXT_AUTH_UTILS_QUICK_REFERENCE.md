# Nuxt Auth Utils: Quick Reference Guide

## Installation

```bash
npm install nuxt-auth-utils
```

## Environment Variables

```bash
# Required: Session encryption (minimum 32 characters)
NUXT_SESSION_PASSWORD=your-super-secret-password-with-at-least-32-characters

# OAuth Providers (add as needed)
NUXT_OAUTH_GITHUB_CLIENT_ID=...
NUXT_OAUTH_GITHUB_CLIENT_SECRET=...
NUXT_OAUTH_GOOGLE_CLIENT_ID=...
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=...
```

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],

  auth: {
    loadStrategy: 'ssr',  // 'ssr' | 'client-only'
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

## Server-Side Utilities

### Set Session (Login)

```typescript
import { setUserSession } from '#auth-utils'

await setUserSession(event, {
  user: {
    id: '123',
    email: 'user@example.com',
    name: 'John Doe'
  },
  secure: {
    // Server-only, not sent to client
    apiToken: 'secret_token'
  },
  loggedInAt: Date.now()
})
```

### Get Session (Protected Routes)

```typescript
import { getUserSession } from '#auth-utils'

const session = await getUserSession(event)
console.log(session.user.id)
```

### Require Session (Throw 401 if not authenticated)

```typescript
import { requireUserSession } from '#auth-utils'

const session = await requireUserSession(event)
// Throws 401 error if not authenticated
```

### Clear Session (Logout)

```typescript
import { clearUserSession } from '#auth-utils'

await clearUserSession(event)
```

### Replace Session (Replace entire session data)

```typescript
import { replaceUserSession } from '#auth-utils'

await replaceUserSession(event, {
  user: { id: '123' }
})
```

## Password Utilities

### Hash Password

```typescript
import { hashPassword } from '#auth-utils'

const hashedPassword = await hashPassword('user_password')
```

### Verify Password

```typescript
import { verifyPassword } from '#auth-utils'

const isValid = await verifyPassword(hashedPassword, 'user_password')
if (isValid) {
  // Password matches
}
```

### Check if Rehash Needed

```typescript
import { passwordNeedsRehash } from '#auth-utils'

if (passwordNeedsRehash(hashedPassword)) {
  const newHash = await hashPassword(plainTextPassword)
  // Update database with new hash
}
```

## OAuth Handlers

### Generic Pattern

```typescript
// server/routes/auth/[provider].get.ts
export default defineOAuth<Provider>EventHandler({
  config: {
    scope: ['email', 'profile'],
    // provider-specific options
  },
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email
      }
    })
    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  }
})
```

### GitHub OAuth

```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
    scope: ['user:email', 'read:user']
  },
  async onSuccess(event, { user, tokens }) {
    // Handle GitHub user
  }
})
```

### Google OAuth

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile', 'openid'],
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent'
    }
  },
  async onSuccess(event, { user, tokens }) {
    // Handle Google user
  }
})
```

### Apple OAuth

```typescript
// server/routes/auth/apple.get.ts
export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user, tokens }) {
    // Handle Apple user
  }
})
```

## Client-Side Composables

### useUserSession

```typescript
const {
  loggedIn,     // ComputedRef<boolean>
  ready,        // ComputedRef<boolean> - session loaded
  user,         // ComputedRef<User | null>
  session,      // Ref<UserSession>
  fetch,        // () => Promise<void> - refresh session
  clear,        // () => Promise<void> - logout
  openInPopup   // (route, size?) => void - OAuth in popup
} = useUserSession()

// Usage
if (loggedIn.value) {
  console.log(user.value.email)
}

await clear()  // Logout

await fetch()  // Refresh session from server

openInPopup('/auth/github', { width: 600, height: 700 })
```

### AuthState Component (for Hybrid Rendering)

```vue
<template>
  <AuthState v-slot="{ loggedIn, clear }">
    <button v-if="loggedIn" @click="clear">Logout</button>
    <NuxtLink v-else to="/login">Login</NuxtLink>
  </AuthState>
</template>
```

## Middleware

### Require Authentication

```typescript
// app/middleware/auth.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn, ready } = useUserSession()

  if (!ready.value) return

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})

// Use in page
definePageMeta({
  middleware: ['auth']
})
```

### Require Admin Role

```typescript
// app/middleware/admin.ts
export default defineRouteMiddleware((to, from) => {
  const { user, ready } = useUserSession()

  if (!ready.value) return

  if (!user.value || user.value.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }
})
```

### Guest Only (Not Logged In)

```typescript
// app/middleware/guest.ts
export default defineRouteMiddleware((to, from) => {
  const { loggedIn, ready } = useUserSession()

  if (!ready.value) return

  if (loggedIn.value) {
    return navigateTo('/dashboard')
  }
})
```

## Session Hooks

```typescript
// server/plugins/session.ts
export default defineNitroPlugin(() => {
  // Called when session is fetched
  sessionHooks.hook('fetch', async (session, event) => {
    // Extend session with additional data
    // Validate user status
    // Throw error if invalid
  })

  // Called when session is cleared (logout)
  sessionHooks.hook('clear', async (session, event) => {
    // Log logout event
    // Clean up resources
  })
})
```

## WebAuthn (Passkeys)

### Installation

```bash
npm install @simplewebauthn/server@11 @simplewebauthn/browser@11
```

### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  auth: {
    webAuthn: true
  }
})
```

### Register Handler

```typescript
// server/api/webauthn/register.post.ts
export default defineWebAuthnRegisterEventHandler({
  async validateUser(userBody, event) {
    return z.object({
      userName: z.string().email()
    }).parse(userBody)
  },

  async excludeCredentials(event, userName) {
    // Return existing credentials to prevent re-registration
    const creds = await db.credentials.findMany({
      where: { user: { email: userName } }
    })
    return creds.map(c => ({ id: c.id }))
  },

  async onSuccess(event, { credential, user }) {
    // Store credential in database
    const dbUser = await db.users.create({
      data: { email: user.userName }
    })

    await db.credentials.create({
      data: {
        userId: dbUser.id,
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter
      }
    })

    await setUserSession(event, {
      user: { id: dbUser.id, email: dbUser.email }
    })
  }
})
```

### Authenticate Handler

```typescript
// server/api/webauthn/authenticate.post.ts
export default defineWebAuthnAuthenticateEventHandler({
  async allowCredentials(event, userName) {
    const user = await db.users.findUnique({
      where: { email: userName }
    })

    if (!user) throw createError({ statusCode: 400 })

    return user.credentials.map(c => ({ id: c.id }))
  },

  async getCredential(event, credentialId) {
    const cred = await db.credentials.findUnique({
      where: { id: credentialId }
    })

    return {
      id: cred.id,
      publicKey: cred.publicKey,
      counter: cred.counter
    }
  },

  async onSuccess(event, { credential, authenticationInfo }) {
    const cred = await db.credentials.findUnique({
      where: { id: credential.id },
      include: { user: true }
    })

    // Update counter
    await db.credentials.update({
      where: { id: credential.id },
      data: { counter: authenticationInfo.newCounter }
    })

    await setUserSession(event, {
      user: {
        id: cred.user.id,
        email: cred.user.email
      }
    })
  }
})
```

### Frontend Usage

```vue
<script setup>
const { register, authenticate } = useWebAuthn()
const { fetch: fetchSession } = useUserSession()

async function signUp() {
  await register({ userName: email.value })
  await fetchSession()
}

async function signIn() {
  await authenticate(email.value)
  await fetchSession()
}
</script>
```

## API Route Examples

### Login

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

### Signup

```typescript
// server/api/auth/signup.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  const existing = await db.users.findUnique({ where: { email } })
  if (existing) {
    throw createError({ statusCode: 409, message: 'Email already exists' })
  }

  const user = await db.users.create({
    data: {
      email,
      password: await hashPassword(password)
    }
  })

  await setUserSession(event, {
    user: { id: user.id, email: user.email }
  })

  return { success: true }
})
```

### Logout

```typescript
// server/api/auth/logout.post.ts
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { success: true }
})
```

### Protected Route

```typescript
// server/api/user/profile.get.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const user = await db.users.findUnique({
    where: { id: session.user.id }
  })

  return user
})
```

## TypeScript Types

### User Session Interface

```typescript
interface UserSession {
  user?: {
    id: string
    email?: string
    [key: string]: any
  }
  secure?: {
    // Server-only fields
    apiToken?: string
    [key: string]: any
  }
  loggedInAt?: number
  [key: string]: any
}
```

### useUserSession Return Type

```typescript
interface UserSessionComposable {
  ready: ComputedRef<boolean>
  loggedIn: ComputedRef<boolean>
  user: ComputedRef<User | null>
  session: Ref<UserSession>
  fetch: () => Promise<void>
  clear: () => Promise<void>
  openInPopup: (route: string, size?: { width?: number; height?: number }) => void
}
```

## Database Schema Example

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  banned BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_oauth_providers (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  providerId TEXT NOT NULL,
  email TEXT,
  username TEXT,
  avatar TEXT,
  accessToken TEXT,
  refreshToken TEXT,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, providerId)
);

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

## Common Patterns

### Check if User is Admin

```typescript
// Component
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

// Server route
const session = await getUserSession(event)
if (session.user?.role !== 'admin') {
  throw createError({ statusCode: 403 })
}
```

### Refresh User Data

```vue
<script setup>
const { fetch } = useUserSession()

async function refreshUser() {
  await fetch()
}
</script>
```

### OAuth Popup Login

```vue
<script setup>
const { openInPopup } = useUserSession()

function loginWithGithub() {
  openInPopup('/auth/github', { width: 600, height: 700 })
}
</script>

<template>
  <button @click="loginWithGithub">GitHub Login</button>
</template>
```

### Store Sensitive Data Server-Only

```typescript
// Good: sensitive data in secure field
await setUserSession(event, {
  user: { id: user.id, email: user.email },
  secure: { apiToken: 'secret', refreshToken: 'secret' }
})

// Bad: sensitive data exposed to client
await setUserSession(event, {
  user: {
    id: user.id,
    email: user.email,
    apiToken: 'secret'  // This gets sent to client!
  }
})
```

## Supported OAuth Providers

Apple, Atlassian, Auth0, Authentik, AWS Cognito, Azure B2C, Battle.net, Bluesky, Discord, Dropbox, Facebook, GitHub, GitLab, Gitea, Google, Heroku, Hubspot, Instagram, Kick, Line, Linear, LinkedIn, LiveChat, Microsoft, Okta, Ory, PayPal, Polar, Salesforce, Seznam, Shopify Customer, Slack, Spotify, Steam, Strava, TikTok, Twitch, VK, WorkOS, X (Twitter), XSUAA, Yandex, Zitadel, Keycloak

## Session Constraints

- **Cookie size limit**: 4096 bytes (encrypted)
- **Session duration**: Default 7 days (configurable)
- **Cookie properties**: httpOnly, secure (HTTPS), sameSite
- **Data location**: Client sees only non-secure fields

## Important Notes

1. **No database session table needed**: Sessions stored in encrypted cookies
2. **Secure field is server-only**: Not sent to client in any API response
3. **Session password must be 32+ characters**: For encryption security
4. **HTTPS only in production**: Set `secure: true` in cookie config
5. **No external session store**: Works with serverless/edge functions

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Session not persisting | Check NUXT_SESSION_PASSWORD is set (32+ chars) |
| useUserSession undefined | Ensure nuxt-auth-utils is installed and in nuxt.config |
| OAuth redirect failing | Verify provider credentials and redirect URL |
| 401 errors on protected routes | Check session is being set in login route |
| Cookie size exceeded | Reduce data in session; use secure field for large data |
| Password verification failing | Ensure consistent hashing (verify via database) |

