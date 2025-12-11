# Nuxt Auth Utils: Architecture Diagrams

## 1. Session Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT SIDE                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Vue Component                                                │
│  ├─ useUserSession()                                         │
│  │  ├─ loggedIn (computed)                                   │
│  │  ├─ user (computed)                                       │
│  │  ├─ session (ref)                                         │
│  │  ├─ fetch() → GET /api/_auth/session                      │
│  │  ├─ clear() → POST /api/auth/logout                       │
│  │  └─ openInPopup('/auth/github')                           │
│  │                                                            │
│  └─ Rendered HTML                                            │
│     ├─ Show if loggedIn                                      │
│     ├─ Show user.email, user.role                            │
│     └─ Button to clear (logout)                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         │ HTTP Request                        │ Response
         │ (with cookies)                      │ (with Set-Cookie)
         ↓                                      ↑
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Layer                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Cookie Jar                                                   │
│  ├─ nuxt-session=<encrypted_data>                            │
│  ├─ Max 4096 bytes                                           │
│  └─ Encrypted with NUXT_SESSION_PASSWORD                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         │ HTTP Request                        │ Response
         │ (with encrypted cookie)            │ (from server)
         ↓                                      ↑
┌─────────────────────────────────────────────────────────────┐
│                      SERVER SIDE                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Request Handler                                              │
│  ├─ Decrypt cookie                                           │
│  ├─ Extract session data                                     │
│  ├─ Call sessionHooks.hook('fetch')                          │
│  │  ├─ Validate user exists                                  │
│  │  ├─ Check if banned                                       │
│  │  └─ Enrich with fresh data                                │
│  ├─ setUserSession(event, {...})                             │
│  │  └─ Encrypt and set new cookie                            │
│  ├─ requireUserSession(event)                                │
│  │  └─ Throw 401 if not authenticated                        │
│  └─ clearUserSession(event)                                  │
│     └─ Delete cookie                                         │
│                                                               │
│  Database                                                     │
│  ├─ users table                                              │
│  ├─ user_oauth_providers table                               │
│  └─ credentials table (WebAuthn)                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Authentication Flow Types

### A. Email/Password Login

```
Login Form
    │
    ├─ User enters email & password
    │
    └─ POST /api/auth/login
         │
         ├─ Validate input
         ├─ Find user by email
         ├─ Verify password (scrypt)
         ├─ Check if needs rehash
         │
         ├─ setUserSession(event, {
         │   user: { id, email, role },
         │   loggedInAt: Date.now()
         │ })
         │
         └─ Response: { success: true, user: {...} }
              │
              └─ Browser stores encrypted cookie
                 └─ Client redirects to /dashboard
```

### B. OAuth Flow (GitHub Example)

```
Login Button
    │
    ├─ User clicks "Login with GitHub"
    │
    └─ Opens popup: /auth/github
         │
         ├─ defineOAuthGitHubEventHandler()
         ├─ Redirects to github.com/login/oauth/authorize
         │
         └─ User grants permissions at GitHub
              │
              └─ GitHub redirects back with code
                   │
                   ├─ Handler exchanges code for tokens
                   ├─ Fetches user data from GitHub API
                   ├─ Finds or creates user in database
                   ├─ Stores OAuth provider mapping
                   │
                   ├─ setUserSession(event, {
                   │   user: { id, email, role },
                   │   loggedInAt: Date.now()
                   │ })
                   │
                   ├─ Returns sendRedirect(event, '/dashboard')
                   │
                   └─ Popup auto-closes
                        │
                        └─ Client redirected to dashboard
                             │
                             └─ Session cookie sent
```

### C. Logout Flow

```
Logout Button
    │
    ├─ User clicks "Logout"
    │
    └─ await useUserSession().clear()
         │
         ├─ POST /api/auth/logout
         │
         └─ Server handler:
              ├─ Get current session
              ├─ Log logout event (audit)
              ├─ clearUserSession(event)
              │  └─ Delete encrypted cookie
              └─ Response: { success: true }
                   │
                   └─ Client:
                      ├─ Clear session state
                      └─ Redirect to /login
```

## 3. Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│              Session Data Structure                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  {                                                    │
│    user: {                    ← Sent to client       │
│      id: "user_123",                                 │
│      email: "user@example.com",                      │
│      name: "John Doe",                               │
│      role: "admin",                                  │
│      avatar: "https://..."                           │
│    },                                                 │
│                                                       │
│    secure: {                  ← Server-only!         │
│      apiToken: "secret_xyz",                         │
│      refreshToken: "secret_abc"                      │
│    },                                                 │
│                                                       │
│    loggedInAt: 1702200000000                         │
│  }                                                    │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  ENCRYPTION PROCESS                        │     │
│  ├────────────────────────────────────────────┤     │
│  │ 1. Serialize to JSON                       │     │
│  │ 2. Compress with gzip                      │     │
│  │ 3. Encrypt with AES-GCM                    │     │
│  │    Key: NUXT_SESSION_PASSWORD (32+ chars) │     │
│  │ 4. Encode as base64                        │     │
│  │ 5. Store in cookie: nuxt-session=<data>   │     │
│  │ 6. Set httpOnly, secure, sameSite flags    │     │
│  │ 7. Send with response                      │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  DECRYPTION PROCESS (on each request)      │     │
│  ├────────────────────────────────────────────┤     │
│  │ 1. Browser sends cookie with request       │     │
│  │ 2. Server receives encrypted cookie        │     │
│  │ 3. Decode from base64                      │     │
│  │ 4. Decrypt with AES-GCM using password     │     │
│  │ 5. Decompress from gzip                    │     │
│  │ 6. Parse JSON                              │     │
│  │ 7. Call sessionHooks.hook('fetch')         │     │
│  │    - Validate user                         │     │
│  │    - Check permissions                     │     │
│  │    - Enrich with fresh data                │     │
│  │ 8. Return decrypted session                │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## 4. Database Schema Diagram

```
┌─────────────────────────────────┐
│         users                   │
├─────────────────────────────────┤
│ id (PK)                 TEXT    │
│ email (UNIQUE)          TEXT    │
│ password (nullable)     TEXT    │ ← Scrypt hash
│ name                    TEXT    │
│ avatar                  TEXT    │ ← URL
│ role                    TEXT    │ ← user|contributor|admin
│ banned                  BOOL    │
│ createdAt               TS      │
│ updatedAt               TS      │
└─────────────────────────────────┘
         │
         │ 1:N
         │
┌─────────────────────────────────┐
│  user_oauth_providers           │
├─────────────────────────────────┤
│ id (PK)                 TEXT    │
│ userId (FK)             TEXT    │ → users.id
│ provider                TEXT    │ ← 'github', 'google', 'apple'
│ providerId (UNIQUE)     TEXT    │ ← Provider's user ID
│ email                   TEXT    │ ← May differ from users.email
│ username                TEXT    │ ← GitHub login, etc.
│ avatar                  TEXT    │ ← Provider's avatar
│ accessToken             TEXT    │ ← For API calls
│ refreshToken            TEXT    │ ← For token refresh
│ expiresAt               TS      │
│ createdAt               TS      │
│ updatedAt               TS      │
└─────────────────────────────────┘
         │
         │ 1:N
         │
┌─────────────────────────────────┐
│      credentials                │
├─────────────────────────────────┤
│ id (PK)                 TEXT    │
│ userId (FK)             TEXT    │ → users.id
│ publicKey               TEXT    │ ← WebAuthn public key
│ counter                 INT     │ ← Prevents cloning
│ backedUp                BOOL    │ ← Device backup status
│ transports              TEXT    │ ← JSON: ['usb', 'nfc', ...]
│ createdAt               TS      │
└─────────────────────────────────┘

NOTES:
┌─────────────────────────────────┐
│ NO SESSION TABLE!               │
│ Sessions are encrypted cookies  │
│ Not stored in database          │
└─────────────────────────────────┘
```

## 5. Request/Response Cycle

```
CLIENT REQUEST
│
├─ Browser sends HTTP request
│  └─ Headers: { Authorization: ... }
│  └─ Cookies: { nuxt-session=<encrypted> }
│
▼
SERVER RECEIVES REQUEST
│
├─ defineEventHandler(async (event) => {
│
├─ GET ENCRYPTED COOKIE
│  └─ getCookie(event, 'nuxt-session')
│
├─ DECRYPT SESSION
│  ├─ Decode base64
│  ├─ Decrypt with NUXT_SESSION_PASSWORD (AES-GCM)
│  └─ Decompress gzip
│  └─ Parse JSON
│
├─ CALL SESSION HOOKS
│  └─ sessionHooks.hook('fetch', async (session, event) => {
│     ├─ Find user in database
│     ├─ Validate user is active (not banned)
│     ├─ Check permissions
│     └─ Enrich session with fresh data
│  })
│
├─ EXECUTE ROUTE LOGIC
│  ├─ const session = await getUserSession(event)
│  ├─ Access session.user, session.secure
│  └─ Return data
│
├─ SET NEW SESSION (if updated)
│  └─ await setUserSession(event, {
│     user: { ... updated user ... },
│     secure: { ... updated secure data ... }
│  })
│  ├─ Serialize to JSON
│  ├─ Compress with gzip
│  ├─ Encrypt with AES-GCM
│  ├─ Encode as base64
│  └─ Set response header: Set-Cookie: nuxt-session=<encrypted>
│
▼
SERVER RESPONSE
│
├─ Response body: { success: true, data: {...} }
│
├─ Response headers:
│  └─ Set-Cookie: nuxt-session=<encrypted>; HttpOnly; Secure; SameSite=lax
│
▼
CLIENT RECEIVES RESPONSE
│
├─ Browser stores encrypted cookie
├─ Client JavaScript updates state
└─ Re-render UI with new data
```

## 6. Middleware Chain

```
┌──────────────────────────────────────┐
│  Incoming Request                    │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  Global Middleware (execute-first)   │
│  ├─ CORS setup                       │
│  ├─ Logging                          │
│  └─ Rate limiting                    │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  Route Middleware (per-route)        │
│  ├─ middleware: ['auth']             │
│  ├─ middleware: ['admin']            │
│  ├─ middleware: ['guest']            │
│  └─ ...custom middleware             │
└──────────────────────────────────────┘
            │
            ├─ GUEST MIDDLEWARE
            │  ├─ Check if loggedIn
            │  └─ Redirect to /dashboard if already authenticated
            │
            ├─ AUTH MIDDLEWARE
            │  ├─ Check if loggedIn
            │  └─ Redirect to /login if not authenticated
            │
            ├─ ADMIN MIDDLEWARE
            │  ├─ Check if loggedIn AND role === 'admin'
            │  └─ Throw 403 error if not admin
            │
            ▼
┌──────────────────────────────────────┐
│  Session Hooks (nuxt-auth-utils)    │
│                                      │
│  sessionHooks.hook('fetch', ...)     │
│  ├─ Decrypt cookie                   │
│  ├─ Validate user in database        │
│  ├─ Check banned status              │
│  └─ Enrich session data              │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  Route Handler                       │
│  ├─ const session = await requireUserSession(event)
│  ├─ Access session.user, session.secure
│  └─ Return response                  │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  Response                            │
│  ├─ Return data                      │
│  ├─ Set-Cookie: nuxt-session=<new> │
│  └─ Send to client                   │
└──────────────────────────────────────┘
```

## 7. OAuth Provider Integration

```
┌──────────────────────────────────────────────────────────┐
│                   OAuth Provider                          │
│                  (GitHub/Google/Apple)                    │
└──────────────────────────────────────────────────────────┘
            ▲
            │ Authorization Code
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│               Nuxt Server Route                           │
│           /auth/github.get.ts                             │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  export default defineOAuthGitHubEventHandler({            │
│    config: {                                              │
│      scope: ['user:email', 'read:user'],                  │
│      emailRequired: true                                  │
│    },                                                     │
│                                                            │
│    async onSuccess(event, { user, tokens }) {             │
│      // user: { id, login, email, avatar_url, ... }      │
│      // tokens: { access_token, refresh_token, ... }     │
│                                                            │
│      // 1. Check if provider mapping exists               │
│      const providerMapping =                              │
│        await db.userOAuthProviders.findUnique({           │
│          where: {                                         │
│            provider_providerId: {                         │
│              provider: 'github',                          │
│              providerId: user.id                          │
│            }                                              │
│          }                                                │
│        })                                                 │
│                                                            │
│      // 2. If not, find or create user                    │
│      let dbUser                                           │
│      if (providerMapping) {                               │
│        dbUser = await db.users.findUnique({               │
│          where: { id: providerMapping.userId }            │
│        })                                                 │
│      } else {                                             │
│        dbUser = await db.users.findUnique({               │
│          where: { email: user.email }                     │
│        })                                                 │
│                                                            │
│        if (!dbUser) {                                     │
│          dbUser = await db.users.create({                 │
│            data: {                                        │
│              email: user.email,                           │
│              name: user.name                              │
│            }                                              │
│          })                                               │
│        }                                                  │
│      }                                                    │
│                                                            │
│      // 3. Store/update OAuth provider mapping            │
│      await db.userOAuthProviders.upsert({                 │
│        where: {                                           │
│          provider_providerId: {                           │
│            provider: 'github',                            │
│            providerId: user.id                            │
│          }                                                │
│        },                                                 │
│        create: {                                          │
│          userId: dbUser.id,                               │
│          provider: 'github',                              │
│          providerId: user.id,                             │
│          username: user.login,                            │
│          avatar: user.avatar_url,                         │
│          accessToken: tokens.access_token,                │
│          refreshToken: tokens.refresh_token               │
│        },                                                 │
│        update: {                                          │
│          avatar: user.avatar_url,                         │
│          accessToken: tokens.access_token,                │
│          refreshToken: tokens.refresh_token               │
│        }                                                  │
│      })                                                   │
│                                                            │
│      // 4. Set session                                    │
│      await setUserSession(event, {                        │
│        user: {                                            │
│          id: dbUser.id,                                   │
│          email: dbUser.email,                             │
│          role: dbUser.role                                │
│        },                                                 │
│        loggedInAt: Date.now()                             │
│      })                                                   │
│                                                            │
│      // 5. Redirect to dashboard                          │
│      return sendRedirect(event, '/dashboard')             │
│    },                                                     │
│                                                            │
│    onError(event, error) {                                │
│      // Log error and redirect to login                   │
│      return sendRedirect(event, '/login?error=oauth')    │
│    }                                                      │
│  })                                                       │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## 8. Session Lifecycle

```
USER JOURNEY
│
├─ UNAUTHENTICATED
│  ├─ useUserSession().loggedIn = false
│  ├─ useUserSession().user = null
│  ├─ Cookie: nuxt-session not set
│  └─ Can access: /login, /signup, /forgot-password
│
▼
USER SIGNS UP (or logs in with OAuth)
│
├─ POST /api/auth/signup (or OAuth callback)
│  ├─ Create user in database
│  ├─ Hash password (scrypt)
│  ├─ Call setUserSession()
│  │  ├─ Serialize session
│  │  ├─ Encrypt with NUXT_SESSION_PASSWORD
│  │  └─ Set Set-Cookie header
│  └─ Return response
│
├─ Browser receives response
│  ├─ Stores encrypted cookie
│  └─ Redirects to /dashboard
│
├─ SESSION ACTIVE
│  ├─ useUserSession().loggedIn = true
│  ├─ useUserSession().user = { id, email, role, ... }
│  ├─ Cookie: nuxt-session=<encrypted>
│  └─ Can access: /dashboard, /profile, protected routes
│
▼
USER NAVIGATES (or page refresh)
│
├─ GET /dashboard (with cookie)
│  ├─ Server receives request
│  ├─ Gets encrypted cookie
│  ├─ Decrypts session
│  ├─ Calls sessionHooks.hook('fetch')
│  │  ├─ Validates user in database
│  │  ├─ Checks if banned
│  │  └─ Enriches with fresh data
│  └─ Renders protected page
│
│ Session automatically refreshes with each request
│
▼
USER LOGOUT (or session expires)
│
├─ Session expires after 7 days (default)
│  OR
├─ User clicks logout button
│  ├─ POST /api/auth/logout
│  ├─ clearUserSession()
│  │  └─ Delete Set-Cookie header
│  └─ Return response
│
├─ Browser receives response
│  ├─ Deletes cookie
│  ├─ Clears session state
│  └─ Redirects to /login
│
├─ UNAUTHENTICATED (back to start)
│  ├─ useUserSession().loggedIn = false
│  ├─ useUserSession().user = null
│  ├─ Cookie: nuxt-session deleted
│  └─ Can only access: /login, /signup
│
└─ CYCLE REPEATS
```

## 9. Secure Data Separation

```
REQUEST TO PROTECTED ROUTE
│
├─ useUserSession() on CLIENT SIDE
│  ├─ Receives encrypted cookie
│  ├─ Decrypts cookie
│  ├─ Extracts user field
│  │  ├─ id ✅
│  │  ├─ email ✅
│  │  ├─ role ✅
│  │  └─ Any other public fields ✅
│  │
│  └─ DOES NOT receive secure field ❌
│     (not sent from server to client)
│
▼
REQUEST TO SERVER ROUTE
│
├─ await getUserSession(event) on SERVER SIDE
│  ├─ Receives encrypted cookie
│  ├─ Decrypts cookie
│  ├─ Extracts user field ✅
│  │  ├─ id ✅
│  │  ├─ email ✅
│  │  ├─ role ✅
│  │  └─ Other public fields ✅
│  │
│  └─ ALSO receives secure field ✅
│     ├─ apiToken ✅
│     ├─ refreshToken ✅
│     └─ Other sensitive data ✅
│
│ Only server can access!
│
▼
RESPONSE TO CLIENT
│
├─ Server sends response body: { success: true, data: {} }
│  └─ Does not include apiToken ❌
│  └─ Does not include refreshToken ❌
│
├─ Browser receives response
│  └─ Can only see public user data
│
└─ Client state updated
   └─ Cannot access secure field
      (it was never sent!)
```

## 10. Better Auth vs Nuxt Auth Utils Architecture

```
BETTER AUTH
│
├─ Session Storage
│  ├─ Database Tables
│  │  ├─ session table
│  │  ├─ account table
│  │  ├─ user table
│  │  ├─ verification table
│  │  └─ etc.
│  │
│  └─ Session Lookup Flow
│     ├─ Client sends request with cookies
│     ├─ Server reads cookie (session ID)
│     ├─ Query database: SELECT * FROM session WHERE id = ?
│     ├─ Wait for database response
│     └─ Return session data
│
├─ Scaling Challenge
│  └─ Session table grows with users
│     └─ Database load increases
│
├─ Deployment Challenge
│  └─ Requires database in every region
│     └─ Complex for multi-region setup
│
└─ Cleanup Challenge
   └─ Expired sessions in table
      └─ Need cronjob to clean up


NUXT AUTH UTILS
│
├─ Session Storage
│  ├─ Encrypted Cookies
│  │  ├─ Client-side storage
│  │  ├─ HTTP-only flag
│  │  ├─ Encrypted with AES-GCM
│  │  └─ Max 4096 bytes
│  │
│  └─ Session Lookup Flow
│     ├─ Client sends request with cookies
│     ├─ Server receives encrypted cookie
│     ├─ Decrypt in-memory
│     ├─ Extract session immediately
│     └─ Return session data (no DB required!)
│
├─ Scaling Advantage
│  └─ No session table
│     └─ Database stays small
│
├─ Deployment Advantage
│  └─ Works in any region
│     └─ No database dependency for sessions
│
└─ Cleanup Advantage
   └─ Automatic expiration
      └─ Browser deletes expired cookies
```

These diagrams provide visual representations of how nuxt-auth-utils works at every level of your application.
