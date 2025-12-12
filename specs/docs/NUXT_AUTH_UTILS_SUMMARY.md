# Nuxt Auth Utils: Comprehensive Research Summary

## Documents Created

This research has generated three comprehensive guides for your migration from Better Auth to nuxt-auth-utils:

1. **NUXT_AUTH_UTILS_RESEARCH.md** (41KB)
   - Complete architecture and design patterns
   - Detailed code examples for all features
   - Session management patterns
   - OAuth implementation guide
   - WebAuthn/passkey authentication
   - Database schema requirements
   - Security best practices
   - Comparison table with Better Auth

2. **MIGRATION_PLAN_BETTER_AUTH_TO_NUXT_AUTH_UTILS.md** (32KB)
   - Step-by-step 21-day migration timeline
   - Parallel setup with Better Auth
   - Data migration scripts
   - Component and composable migration guide
   - Complete testing checklist
   - Rollback procedures
   - Success criteria

3. **NUXT_AUTH_UTILS_QUICK_REFERENCE.md** (15KB)
   - Quick lookup for APIs and utilities
   - Syntax examples for common patterns
   - Middleware templates
   - Database schema example
   - Troubleshooting guide

---

## Key Findings

### 1. Core Architecture

**nuxt-auth-utils** uses **encrypted cookies** for session management instead of database tables.

```
Better Auth:      user → session → account → verification
nuxt-auth-utils:  user → oauth_providers → credentials (encrypted cookie)
                                           └─ no session table
```

**Advantages for Your Project**:
- Smaller database schema
- Serverless/edge-friendly
- Faster session lookups
- Simpler deployment

### 2. Session Management

#### Storage Method: Encrypted Cookies
- Encryption: AES-GCM via `NUXT_SESSION_PASSWORD` (32+ characters)
- Size limit: 4096 bytes (constraint to manage)
- Duration: Configurable (default 7 days)
- Security: httpOnly, secure (HTTPS), sameSite=lax

#### Data Structure
```typescript
session {
  user: {        // Sent to client
    id,
    email,
    role,
    // Custom fields
  },
  secure: {      // Server-only, NOT sent to client
    apiToken,
    refreshToken
  },
  loggedInAt: number
}
```

### 3. Authentication Methods Supported

| Method | Status | Notes |
|--------|--------|-------|
| Email/Password | ✅ Included | Using scrypt hashing |
| OAuth | ✅ Included | 40+ providers (GitHub, Google, Apple, Discord, etc.) |
| WebAuthn | ✅ Included | Passkey/biometric authentication |
| Magic Links | ❌ Manual | Can implement with custom logic |
| SMS OTP | ❌ Manual | Can implement with custom logic |

### 4. OAuth Providers (40+ Available)

**Tested & Recommended**:
- GitHub
- Google
- Apple
- Discord

**Other Notable**:
- Keycloak (enterprise SSO)
- Microsoft/Azure
- Okta
- Twitch, Spotify, LinkedIn, etc.

**Implementation Pattern**:
```typescript
export default defineOAuth<Provider>EventHandler({
  config: { scope: [], ... },
  async onSuccess(event, { user, tokens }) {
    // Set session
  },
  onError(event, error) {
    // Handle error
  }
})
```

### 5. Database Requirements

**Minimal Schema** (no session table needed):

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,  -- For email/password auth
  role TEXT,      -- For RBAC
  ...
);

-- OAuth mappings (optional if using OAuth)
CREATE TABLE user_oauth_providers (
  provider TEXT,
  providerId TEXT UNIQUE,
  userId REFERENCES users,
  ...
);

-- WebAuthn credentials (optional if using passkeys)
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  userId REFERENCES users,
  publicKey TEXT NOT NULL,
  counter INTEGER,
  ...
);
```

**What You DON'T Need**:
- ❌ session table
- ❌ account table
- ❌ verification table
- ❌ external session store

### 6. Client-Side Integration

**Composable: `useUserSession()`**

```typescript
const {
  loggedIn,      // boolean - user authenticated?
  ready,         // boolean - session loaded from server?
  user,          // User object or null
  session,       // Full session data
  fetch,         // Refresh session from server
  clear,         // Logout and clear session
  openInPopup    // OAuth in popup (auto-closes)
} = useUserSession()
```

**Hybrid Rendering Support**:
- Works with SSR (server-side rendering)
- Works with prerendering/static generation
- Works with client-only loading
- Handles cached routes correctly

### 7. Session Persistence & Security

**Cookie Configuration**:
```typescript
cookie: {
  httpOnly: true,              // Prevent JS access
  secure: true,                // HTTPS only (production)
  sameSite: 'lax',             // CSRF protection
  // maxAge handled by nuxt-auth-utils
}
```

**Security Best Practices**:
1. Store only essential data in session (< 4096 bytes)
2. Use `secure` field for sensitive server-only data
3. Validate user on every request via session hooks
4. Check user status/banned flag on session fetch
5. Hash passwords with scrypt (built-in)
6. Rate limit authentication endpoints
7. Log authentication events for audit trail
8. Set session password to 32+ random characters

### 8. Migration from Better Auth

**High-Level Steps**:

1. **Days 1-3**: Parallel setup
   - Install nuxt-auth-utils
   - Create new API routes alongside Better Auth
   - Both systems run simultaneously

2. **Days 4-5**: Data migration
   - Migrate users to new schema
   - Copy password hashes
   - Migrate OAuth provider mappings

3. **Days 6-10**: Component migration
   - Update composables (useAuth, useRole)
   - Update middleware (auth, admin, guest)
   - Update login/signup pages

4. **Days 11-14**: Testing
   - Unit tests for auth flows
   - Integration tests for complete flows
   - Manual testing checklist

5. **Day 15**: Feature flag cutover
   - Toggle between systems if needed
   - Gradual rollout option

6. **Days 16-21**: Cleanup
   - Remove Better Auth dependencies
   - Drop unused tables
   - Update documentation
   - Monitor production

### 9. API Patterns

**Login Route**:
```typescript
// POST /api/auth/login
// Body: { email, password }
// Returns: { success, user }
// Sets encrypted session cookie
```

**Signup Route**:
```typescript
// POST /api/auth/signup
// Body: { email, password, name }
// Returns: { success, user }
// Auto sign-in (sets session)
```

**OAuth Route**:
```typescript
// GET /auth/github (or any provider)
// Redirects to provider
// Returns with session set
// Redirects to dashboard
```

**Logout Route**:
```typescript
// POST /api/auth/logout
// Returns: { success }
// Clears session cookie
```

**Protected Route**:
```typescript
// Any route using requireUserSession()
// Returns 401 if not authenticated
// Otherwise returns user data
```

### 10. Comparison: Better Auth vs nuxt-auth-utils

| Feature | Better Auth | nuxt-auth-utils | Winner |
|---------|------------|-----------------|--------|
| **Session Storage** | Database tables | Encrypted cookies | nuxt-auth-utils |
| **Database Required** | Yes (3+ tables) | No (optional) | nuxt-auth-utils |
| **Setup Complexity** | Medium-High | Low | nuxt-auth-utils |
| **Serverless Friendly** | Medium | Excellent | nuxt-auth-utils |
| **WebAuthn Support** | No | Yes | nuxt-auth-utils |
| **OAuth Providers** | 50+ | 40+ | Comparable |
| **Password Hashing** | argon2 | scrypt | Comparable |
| **Bundle Size** | Larger | Smaller | nuxt-auth-utils |
| **Hybrid Rendering** | Partial | Full | nuxt-auth-utils |
| **Learning Curve** | Steep | Moderate | nuxt-auth-utils |
| **Type Safety** | Good | Excellent | nuxt-auth-utils |
| **Production Ready** | Yes | Yes | Comparable |

---

## Critical Implementation Details

### Cookie Size Constraint

The encrypted session is limited to **4096 bytes**.

**What Fits**:
```typescript
{
  user: {
    id: "123",
    email: "user@example.com",
    name: "John Doe",
    role: "admin"
  },
  loggedInAt: 1702200000000
}
// ≈ 150 bytes ✅
```

**What Doesn't Fit**:
```typescript
{
  user: {
    profile: { /* large object */ },
    posts: [ /* array of posts */ ],
    subscription: { /* complex data */ }
  }
}
// ≈ Several KB ❌
```

**Solution**: Use `secure` field for large/sensitive data (stays on server).

### Password Hashing

nuxt-auth-utils uses **scrypt** (same family as argon2, both strong).

```typescript
const hashedPassword = await hashPassword('user_password')
const isValid = await verifyPassword(hashedPassword, 'user_password')

// Check if hash is outdated after config changes
if (passwordNeedsRehash(hashedPassword)) {
  const newHash = await hashPassword(userPassword)
}
```

### OAuth Flow

1. User clicks "Login with GitHub" button
2. Redirected to `/auth/github` route
3. Route handler uses `defineOAuthGitHubEventHandler`
4. Redirects to GitHub authorization page
5. User grants permissions
6. GitHub redirects back with authorization code
7. Handler exchanges code for user data and tokens
8. Creates/updates user in database
9. Sets encrypted session cookie
10. Redirects to dashboard
11. Browser cookie sent on all subsequent requests

### Session Validation on Every Request

```typescript
// server/plugins/session.ts
sessionHooks.hook('fetch', async (session, event) => {
  if (!session.user?.id) return

  // Verify user exists and is active
  const user = await db.users.findUnique({
    where: { id: session.user.id }
  })

  if (!user || user.banned) {
    throw createError({ statusCode: 401 })
  }

  // Enrich session (optional)
  session.user.role = user.role
})
```

This ensures:
- Deleted users cannot use stale sessions
- Banned users are immediately locked out
- Permissions can be updated in real-time

---

## Recommended Architecture for Your Project

Given your Nuxt 4 starter project with:
- Stripe integration (subscriptions)
- Admin user management
- Role-based access (user, contributor, admin)
- OAuth providers (GitHub, Google, Apple)
- Self-hosted PostgreSQL (Supabase)

**Recommended Setup**:

```
App Layer:
├─ useAuth() composable (wrapper)
├─ useRole() composable (role checking)
├─ Middleware (auth, admin, guest)
└─ Components (login, signup, profile)

Server Layer:
├─ API Routes (login, signup, logout)
├─ OAuth Routes (github, google, apple)
├─ Protected Routes (user, admin)
└─ Session Hooks (validation, logging)

Database Layer:
├─ users table (core data)
├─ user_oauth_providers (OAuth mappings)
├─ credentials (WebAuthn - optional)
├─ audit_logs (security logging)
└─ subscriptions (Stripe integration)

Encryption:
└─ Session cookies (NUXT_SESSION_PASSWORD)
```

**Session Data to Store**:
```typescript
{
  user: {
    id: string,           // UUID
    email: string,        // user@example.com
    name: string,         // John Doe
    role: string,         // admin|contributor|user
    avatar: string,       // URL to avatar
    subscriptionStatus: string  // active|cancelled|expired
  },
  secure: {
    // Server-only, use for API tokens
  },
  loggedInAt: number      // Timestamp
}
```

---

## Key Advantages for Your Migration

1. **Simpler Database**: No session table = fewer migrations
2. **Stripe Integration**: Easier with session hooks for subscription validation
3. **Admin Features**: Role checking works perfectly with encrypted session
4. **Scalability**: Cookie-based sessions scale to millions of users
5. **Compliance**: No session data stored in database = simpler privacy/GDPR
6. **Performance**: Faster than database session lookups
7. **Security**: Built-in encryption, scrypt hashing, CSRF protection

---

## Potential Challenges & Solutions

### Challenge 1: Session Data Limit (4096 bytes)

**Problem**: You want to store lots of user data in session.

**Solution**:
- Store only ID, email, role, status
- Load additional data from database when needed
- Use secure field for sensitive server-only data

### Challenge 2: Real-Time Subscription Status

**Problem**: Stripe webhook updates subscription, but session has old data.

**Solution**:
- Call `useUserSession().fetch()` after Stripe webhook
- Or check subscription status in session hooks
- Or check subscription table in route before returning data

### Challenge 3: OAuth Provider Matching

**Problem**: User has multiple OAuth accounts, how to link them?

**Solution**:
- Store provider mappings in user_oauth_providers table
- Match by email during OAuth callback
- Offer manual account linking UI

### Challenge 4: Password Reset Handling

**Problem**: User resets password, but session still valid with old hash.

**Solution**:
- Add `passwordChangedAt` timestamp to users table
- Check in session hooks: if password changed > session created, force logout
- Or use a version field in session

---

## Files to Review

### For Architecture Understanding
- **NUXT_AUTH_UTILS_RESEARCH.md**
  - Read sections 1-6 for architecture overview
  - Read section 9 for security details
  - Read section 10 for comparison with Better Auth

### For Step-by-Step Migration
- **MIGRATION_PLAN_BETTER_AUTH_TO_NUXT_AUTH_UTILS.md**
  - Follow Phase 1 for parallel setup
  - Follow Phase 2 for data migration
  - Follow Phase 3-6 for component and cleanup

### For Quick Reference During Development
- **NUXT_AUTH_UTILS_QUICK_REFERENCE.md**
  - Copy/paste code examples
  - Quick lookup for composables and utilities
  - Troubleshooting section

---

## Next Steps

1. **Review** the research documents (start with architecture overview)

2. **Plan** - Decide on timeline:
   - Quick migration (2-3 weeks): Follow migration plan
   - Gradual migration (4-6 weeks): Run both systems in parallel
   - Full rewrite (1 week): Start fresh with new auth

3. **Setup** - Day 1-3 of migration plan:
   - Install nuxt-auth-utils
   - Create environment variables
   - Create new API routes

4. **Migrate Data** - Days 4-5:
   - Run migration script
   - Verify data integrity
   - Test with migrated users

5. **Update Components** - Days 6-10:
   - Update composables
   - Update middleware
   - Update pages

6. **Test** - Days 11-15:
   - Run test suites
   - Manual testing
   - Feature flag testing

7. **Deploy** - Days 16-21:
   - Remove Better Auth
   - Update documentation
   - Monitor production

---

## Questions to Consider

Before starting migration, answer these:

1. **Timeline**: How much time can you allocate?
   - 2-3 weeks for quick migration
   - 4-6 weeks for parallel setup

2. **Risk Tolerance**: Can you run both systems simultaneously?
   - Yes → Safer, slower migration
   - No → Faster, requires downtime

3. **Data Integrity**: Do you need to export all sessions?
   - Yes → Keep Better Auth during transition
   - No → Fresh login required after cutover

4. **Features to Keep**: Which auth features are critical?
   - Email/password → Implement immediately
   - OAuth → Implement in parallel
   - WebAuthn → Can add later

5. **Database**: Keep Better Auth tables during migration?
   - Yes → More data to maintain
   - No → Cleaner cutover

---

## Summary

**nuxt-auth-utils** is a modern, production-ready authentication solution that:

✅ Uses encrypted cookies (no session table)
✅ Supports 40+ OAuth providers (GitHub, Google, Apple)
✅ Includes password hashing (scrypt)
✅ Includes WebAuthn/passkeys
✅ Works with hybrid rendering and serverless
✅ Smaller database schema than Better Auth
✅ Excellent TypeScript support
✅ Comprehensive security features

It's an excellent choice for migrating from Better Auth and will result in:
- Simpler database schema
- Faster authentication
- Better serverless support
- Modern authentication features (WebAuthn)
- Smaller bundle size

The 21-day migration plan provides a safe, step-by-step approach to modernize your authentication without breaking existing functionality.

