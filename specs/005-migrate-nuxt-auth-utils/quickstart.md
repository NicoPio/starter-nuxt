# Quickstart: Migration Better Auth → nuxt-auth-utils

**Feature**: 005-migrate-nuxt-auth-utils
**Date**: 2025-12-10
**Audience**: Développeurs implémentant la migration

## Prérequis

- Node.js 18+ / Bun installé
- Supabase local running (`supabase start`)
- Accès à la branche `005-migrate-nuxt-auth-utils`
- Backups base de données récents

## Installation

### Étape 1: Installer nuxt-auth-utils

```bash
# Ajouter le module
bun add nuxt-auth-utils

# Vérifier package.json
grep "nuxt-auth-utils" package.json
# Attendu: "nuxt-auth-utils": "^0.x.x"
```

### Étape 2: Configuration Nuxt

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-auth-utils',  // AJOUTER
    '@nuxt/ui',
    // ... autres modules
  ],

  runtimeConfig: {
    session: {
      // Clé de chiffrement (32+ caractères, générer avec openssl)
      password: process.env.NUXT_SESSION_PASSWORD || '',
      name: 'nuxt-session',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      },
      maxAge: 60 * 60 * 24 * 7  // 7 jours
    },
    oauth: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || ''
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID || '',
        clientSecret: process.env.APPLE_CLIENT_SECRET || ''
      }
    }
  }
})
```

### Étape 3: Variables d'Environnement

```bash
# .env
# Générer avec: openssl rand -base64 32
NUXT_SESSION_PASSWORD=your-32-char-secret-here

# Feature flag migration (phases)
USE_NUXT_AUTH_UTILS=dual  # false | dual | true

# OAuth (réutiliser les mêmes que Better Auth)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret

# Database (inchangé)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

## Migration Database

### Étape 4: Exécuter Migrations SQL

```bash
# Migration 1: Créer nouvelles tables
supabase db execute < supabase/migrations/006_nuxt_auth_utils_init.sql

# Migration 2: Migrer données
supabase db execute < supabase/migrations/007_migrate_better_auth_data.sql

# Vérifier migration
psql $DATABASE_URL -c "
SELECT 'Users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'OAuth Accounts', COUNT(*) FROM oauth_accounts;
"
```

### Étape 5: Validation Post-Migration

```bash
# Lancer script de validation
psql $DATABASE_URL << 'EOF'
-- Vérifier counts
SELECT
  (SELECT COUNT(*) FROM "user") as old_users,
  (SELECT COUNT(*) FROM users) as new_users,
  (SELECT COUNT(*) FROM "account") as old_oauth,
  (SELECT COUNT(*) FROM oauth_accounts) as new_oauth;

-- Vérifier passwords migrés
SELECT COUNT(*) as users_without_password
FROM users
WHERE hashed_password IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM oauth_accounts WHERE user_id = users.id
  );
-- Attendu: 0 (sauf OAuth-only users)

-- Vérifier Stripe FKs
SELECT COUNT(*) as broken_subscriptions
FROM user_subscriptions us
LEFT JOIN users u ON us.user_id = u.id
WHERE u.id IS NULL;
-- Attendu: 0
EOF
```

## Code Migration

### Étape 6: Migrer Composable `useAuth`

```typescript
// app/composables/useAuth.ts (NOUVELLE VERSION)
export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()
  const toast = useToast()
  const { t } = useContentI18n()

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { email, password, name }
      })

      if (error) {
        return { data: null, error }
      }

      // Rafraîchir session
      await fetch()
      return { data, error: null }
    } catch (error: unknown) {
      return { data: null, error }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })

      if (error) {
        return { data: null, error }
      }

      // Rafraîchir session
      await fetch()
      return { data, error: null }
    } catch (error: unknown) {
      return { data: null, error }
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST'
      })

      // Clear session locale
      await clear()

      toast.add({
        title: t('auth.logout.success'),
        description: t('auth.logout.successMessage'),
        color: 'success'
      })

      await navigateTo('/', { replace: true })
      return { error: null }
    } catch (error: unknown) {
      return { error }
    }
  }

  return {
    user,
    session,
    isAuthenticated: loggedIn,
    signup,
    login,
    logout
  }
}
```

### Étape 7: Server Routes Auth

```typescript
// server/api/auth/login.post.ts
import { verifyPassword } from '~/server/utils/password'
import { getUserByEmail } from '~/server/utils/database/users'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  // Validation
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password required'
    })
  }

  // Récupérer user
  const user = await getUserByEmail(email)
  if (!user || !user.hashed_password) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  // Vérifier password
  const isValid = await verifyPassword(password, user.hashed_password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  // Créer session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined
    },
    loggedInAt: Date.now()
  })

  return { success: true }
})
```

```typescript
// server/api/auth/register.post.ts
import { hashPassword } from '~/server/utils/password'
import { createUser } from '~/server/utils/database/users'

export default defineEventHandler(async (event) => {
  const { email, password, name } = await readBody(event)

  // Validation
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password required'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters'
    })
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Créer user
  const user = await createUser({
    email,
    name: name || email.split('@')[0],
    hashed_password: hashedPassword,
    role: 'User'
  })

  // Auto-login
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined
    },
    loggedInAt: Date.now()
  })

  return { success: true, user }
})
```

```typescript
// server/api/auth/logout.post.ts
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { success: true }
})
```

### Étape 8: OAuth Routes

```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user, tokens }) {
    // Rechercher ou créer user
    let dbUser = await getUserByOAuthProvider('github', user.id.toString())

    if (!dbUser) {
      dbUser = await createUserFromOAuth({
        email: user.email,
        name: user.name || user.login,
        provider: 'github',
        provider_account_id: user.id.toString(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      })
    } else {
      // Mettre à jour tokens
      await updateOAuthTokens('github', user.id.toString(), tokens)
    }

    // Créer session
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name || undefined
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/dashboard')
  },

  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  }
})
```

## Testing

### Étape 9: Tests Unitaires

```typescript
// test/nuxt/composables/useAuth.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '~/composables/useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    // Reset session
    clearNuxtData()
  })

  it('should login with valid credentials', async () => {
    const { login } = useAuth()
    const result = await login('user@example.com', 'password123')

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
  })

  it('should fail login with invalid credentials', async () => {
    const { login } = useAuth()
    const result = await login('wrong@example.com', 'wrong')

    expect(result.error).toBeDefined()
    expect(result.data).toBeNull()
  })
})
```

### Étape 10: Tests E2E

```typescript
// test/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should signup, logout, and login', async ({ page }) => {
    // Signup
    await page.goto('/signup')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')

    // Logout
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL('/')

    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })
})
```

## Cutover Checklist

### Jour -7: Préparation

- [ ] Backups base de données créés
- [ ] Migrations SQL testées en staging
- [ ] Code migration testé en staging
- [ ] Tests E2E passent en staging

### Jour -1: Validation Finale

- [ ] Feature flag `USE_NUXT_AUTH_UTILS=dual` activé en staging
- [ ] Aucune erreur détectée sur 24h
- [ ] Métriques auth stables (latence < 200ms, erreur < 0.1%)

### Jour 0: Cutover Production

```bash
# 1. Activer feature flag
export USE_NUXT_AUTH_UTILS=true

# 2. Redémarrer app
pm2 restart nuxt-app

# 3. Monitoring (30 min)
# - Taux d'erreur auth
# - Latence login/signup
# - Sessions actives count
# - Stripe webhook status

# 4. Validation manuelle
# - Login email/password
# - Login GitHub OAuth
# - Admin panel access
# - Stripe subscription visible
```

### Jour +7: Cleanup

```bash
# Si aucun problème après 7 jours
supabase db execute < supabase/migrations/008_cleanup_better_auth.sql

# Supprimer Better Auth du code
bun remove better-auth
rm -rf lib/auth-client.ts
rm -rf server/utils/auth.ts  # Old Better Auth config

# Commit
git add .
git commit -m "cleanup: remove Better Auth after successful migration"
```

## Rollback Procedure

### Si problème détecté après cutover

```bash
# 1. Désactiver nuxt-auth-utils
export USE_NUXT_AUTH_UTILS=false

# 2. Redémarrer (retour Better Auth)
pm2 restart nuxt-app

# 3. Investiguer logs
pm2 logs nuxt-app --err --lines 100

# 4. Vérifier sessions
psql $DATABASE_URL -c "SELECT COUNT(*) FROM session WHERE expires_at > NOW();"
```

### Si données corrompues

```bash
# Restaurer depuis backup
psql $DATABASE_URL < backup_before_migration.sql

# Vérifier intégrité
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"user\";"
```

## Troubleshooting

### Problème: "NUXT_SESSION_PASSWORD required"

**Solution**:
```bash
# Générer nouvelle clé
openssl rand -base64 32

# Ajouter à .env
echo "NUXT_SESSION_PASSWORD=<generated-key>" >> .env
```

### Problème: "Invalid session cookie"

**Cause**: Clé de chiffrement changée
**Solution**:
```bash
# Vérifier clé n'a pas changé
grep NUXT_SESSION_PASSWORD .env

# Clear cookies navigateur
# Redémarrer app
```

### Problème: "OAuth callback failed"

**Cause**: Callback URL pas configurée
**Solution**:
```bash
# Vérifier callback URLs providers:
# GitHub: http://localhost:3000/auth/github
# Google: http://localhost:3000/auth/google
# Apple: http://localhost:3000/auth/apple
```

## Support

**Documentation**:
- [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils)
- [research.md](./research.md) - Décisions techniques
- [data-model.md](./data-model.md) - Schéma DB

**Questions**:
- Créer issue dans repo avec tag `005-migrate-nuxt-auth-utils`
- Slack: #auth-migration

## Conclusion

Après avoir suivi ce guide :
- ✅ nuxt-auth-utils installé et configuré
- ✅ Base de données migrée (users + oauth_accounts)
- ✅ Code migré (composables + routes + middleware)
- ✅ Tests passent (unit + E2E)
- ✅ Production cutover réussi

**Prochaine étape** : Générer `tasks.md` avec `/speckit.tasks` pour breakdown détaillé.
