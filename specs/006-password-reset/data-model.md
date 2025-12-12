# Data Model: Password Reset Tokens

**Feature**: 006-password-reset
**Date**: 2025-12-12
**Database**: PostgreSQL (Supabase self-hosted)

## Table: `password_reset_tokens`

### Purpose

Stocke les tokens de réinitialisation de mot de passe avec leur métadonnées. Chaque token est hashé avant stockage pour garantir la sécurité même en cas de fuite de la base de données.

### Schema

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,

  -- Indexes pour performance
  INDEX idx_password_reset_tokens_user_id (user_id),
  INDEX idx_password_reset_tokens_expires_at (expires_at),
  INDEX idx_password_reset_tokens_used_at (used_at)
);
```

### Fields Description

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Identifiant unique du token (généré automatiquement) |
| `user_id` | TEXT | NO | Référence à l'utilisateur (FK vers `users.id`) |
| `token_hash` | TEXT | NO | Hash du token (format: `salt:hash` avec scrypt) |
| `expires_at` | TIMESTAMP WITH TIME ZONE | NO | Date et heure d'expiration du token (1 heure après création) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | Date et heure de création (auto-généré) |
| `used_at` | TIMESTAMP WITH TIME ZONE | YES | Date et heure d'utilisation du token (NULL si non utilisé) |

### Constraints

1. **Primary Key**: `id` (UUID)
2. **Foreign Key**: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
3. **NOT NULL**: `user_id`, `token_hash`, `expires_at`, `created_at`
4. **Unique**: Aucune contrainte d'unicité (un utilisateur peut avoir plusieurs tokens non expirés en cas de demandes multiples)

### Indexes

1. **`idx_password_reset_tokens_user_id`**
   - **Colonne**: `user_id`
   - **Type**: B-tree
   - **Raison**: Recherche rapide de tous les tokens d'un utilisateur (pour invalidation)

2. **`idx_password_reset_tokens_expires_at`**
   - **Colonne**: `expires_at`
   - **Type**: B-tree
   - **Raison**: Nettoyage efficace des tokens expirés (tâche cron)

3. **`idx_password_reset_tokens_used_at`**
   - **Colonne**: `used_at`
   - **Type**: B-tree
   - **Raison**: Filtrage rapide des tokens non utilisés (`WHERE used_at IS NULL`)

### TTL (Time To Live) Strategy

**Expiration automatique** : Les tokens expirent après **1 heure** (défini dans `expires_at`).

**Stratégies de nettoyage** :

1. **Validation côté serveur** (priorité haute)
   - Vérifier `expires_at < NOW()` avant toute utilisation
   - Rejeter les tokens expirés même s'ils existent encore en BDD

2. **Nettoyage périodique** (priorité moyenne)
   - Tâche cron ou fonction serverless qui s'exécute toutes les heures
   - Supprime les tokens où `expires_at < NOW() - INTERVAL '24 hours'`
   - Garde 24h d'historique pour le debugging/audit

3. **Invalidation manuelle** (priorité haute)
   - Lors d'une nouvelle demande de réinitialisation :
     - Marquer tous les anciens tokens de l'utilisateur comme expirés (UPDATE `expires_at = NOW()`)
     - OU les supprimer directement (DELETE)
   - Lors de l'utilisation d'un token :
     - Marquer `used_at = NOW()`
     - Rejeter toute réutilisation ultérieure

**Recommandation** : Utiliser la stratégie combinée :
- Validation stricte côté serveur (toujours vérifier `expires_at` et `used_at`)
- Invalidation immédiate lors de nouvelle demande ou utilisation
- Nettoyage périodique pour maintenir la base de données propre

### Example Queries

**Créer un nouveau token :**
```sql
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES (
  'user_123',
  'abc123salt:def456hash',
  NOW() + INTERVAL '1 hour'
)
RETURNING id, expires_at;
```

**Invalider tous les anciens tokens d'un utilisateur :**
```sql
UPDATE password_reset_tokens
SET expires_at = NOW()
WHERE user_id = 'user_123'
  AND used_at IS NULL
  AND expires_at > NOW();
```

OU (suppression directe) :
```sql
DELETE FROM password_reset_tokens
WHERE user_id = 'user_123'
  AND used_at IS NULL
  AND expires_at > NOW();
```

**Trouver un token valide :**
```sql
SELECT id, user_id, token_hash, expires_at, created_at, used_at
FROM password_reset_tokens
WHERE id = 'token_uuid'
  AND used_at IS NULL
  AND expires_at > NOW();
```

**Marquer un token comme utilisé :**
```sql
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id = 'token_uuid'
  AND used_at IS NULL;
```

**Nettoyage des tokens expirés (cron) :**
```sql
DELETE FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '24 hours';
```

**Statistiques (debugging) :**
```sql
SELECT
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) AS active_tokens,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) AS used_tokens,
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at <= NOW()) AS expired_tokens
FROM password_reset_tokens;
```

---

## Relation avec la Table `users`

### Table `users` (existante)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'User',
  hashed_password TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Modifications Requises

**Aucune modification de schéma nécessaire** sur la table `users`.

**Fonctions à ajouter** (utilitaires serveur) :

1. **`updateUserPassword(userId: string, newHashedPassword: string)`**
   - Met à jour `hashed_password` pour un utilisateur
   - Met à jour `updated_at` automatiquement (trigger existant)
   - Invalide toutes les sessions actives (recommandé)

```typescript
// server/utils/database/users.ts
export async function updateUserPassword(
  userId: string,
  newHashedPassword: string
): Promise<void> {
  await db
    .update(users)
    .set({
      hashed_password: newHashedPassword,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
}
```

---

## TypeScript Interfaces

### Interface: `PasswordResetToken`

```typescript
/**
 * Token de réinitialisation de mot de passe
 */
export interface PasswordResetToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  usedAt: Date | null
}

/**
 * Données pour créer un nouveau token
 */
export interface CreatePasswordResetTokenData {
  userId: string
  tokenHash: string
  expiresAt: Date
}

/**
 * Résultat de validation d'un token
 */
export interface TokenValidationResult {
  isValid: boolean
  reason?: 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'TOKEN_USED' | 'TOKEN_INVALID'
  token?: PasswordResetToken
}
```

---

## Migration SQL

### Fichier: `supabase/migrations/010_password_reset_tokens.sql`

```sql
-- =====================================================
-- Migration: 010_password_reset_tokens.sql
-- Date: 2025-12-12
-- Feature: 006-password-reset
-- Description: Create password_reset_tokens table
-- =====================================================

-- Table: password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at
  ON password_reset_tokens(used_at);

-- Commentaires pour documentation
COMMENT ON TABLE password_reset_tokens IS
  'Stores password reset tokens with expiration and usage tracking';

COMMENT ON COLUMN password_reset_tokens.token_hash IS
  'Hashed token (format: salt:hash using scrypt) - NEVER store tokens in plain text';

COMMENT ON COLUMN password_reset_tokens.expires_at IS
  'Token expiration time (1 hour from creation)';

COMMENT ON COLUMN password_reset_tokens.used_at IS
  'Timestamp when the token was used (NULL if unused)';
```

---

## Security Considerations

### 1. Token Storage

**CRITIQUE** : Ne JAMAIS stocker le token en clair dans la base de données.

- ✅ Toujours hasher le token avec scrypt avant stockage
- ✅ Format du hash : `salt:hash` (même pattern que les mots de passe)
- ❌ Ne pas utiliser SHA-256 simple (pas conçu pour cela)

### 2. Token Expiration

- ✅ Expiration stricte après 1 heure (recommandation OWASP)
- ✅ Vérification côté serveur à chaque utilisation
- ✅ Pas de confiance dans le client

### 3. Token Usage

- ✅ Usage unique : `used_at` marqué après utilisation
- ✅ Vérification de `used_at IS NULL` avant acceptation
- ✅ Invalidation de tous les tokens lors d'une nouvelle demande

### 4. Rate Limiting

- ✅ Limiter les demandes de réinitialisation (ex: 1 par 5 minutes par utilisateur)
- ✅ Implémenter via vérification de `created_at` des tokens récents
- ✅ Protéger contre l'énumération d'utilisateurs (toujours retourner "success")

### 5. Cascade Deletion

- ✅ `ON DELETE CASCADE` : Suppression automatique des tokens si l'utilisateur est supprimé
- ✅ Évite les tokens orphelins
- ✅ Maintient l'intégrité référentielle

### 6. Data Retention

- ✅ Garder 24h d'historique pour audit/debugging
- ✅ Nettoyage périodique après 24h
- ✅ Logs des utilisations de tokens (considérer une table d'audit séparée pour production)

---

## Performance Considerations

### Query Optimization

1. **Index sur `user_id`** : Recherche O(log n) au lieu de O(n) pour `WHERE user_id = ?`
2. **Index sur `expires_at`** : Nettoyage efficace des tokens expirés
3. **Index sur `used_at`** : Filtrage rapide `WHERE used_at IS NULL`

### Expected Query Patterns

- **Writes** : ~5-10 par jour par 1000 utilisateurs (demandes de réinitialisation)
- **Reads** : ~10-20 par jour par 1000 utilisateurs (vérification de tokens)
- **Deletes** : ~5-10 par jour + nettoyage périodique (toutes les heures)

### Scalability

Pour **10,000 utilisateurs** :
- ~50-100 demandes de réinitialisation par jour
- ~50-100 vérifications de tokens par jour
- ~100-200 tokens actifs à tout moment
- Taille estimée : < 100 KB en base de données

**Conclusion** : Performance excellente même à grande échelle. Pas de préoccupation de scalabilité.

---

## Testing Strategy

### Unit Tests

1. **CRUD Operations**
   - Créer un token
   - Lire un token par ID
   - Invalider tous les tokens d'un utilisateur
   - Marquer un token comme utilisé
   - Supprimer les tokens expirés

2. **Validation Logic**
   - Token expiré → `isValid: false, reason: 'TOKEN_EXPIRED'`
   - Token déjà utilisé → `isValid: false, reason: 'TOKEN_USED'`
   - Token invalide → `isValid: false, reason: 'TOKEN_INVALID'`
   - Token valide → `isValid: true`

### Integration Tests

1. **Scénario complet**
   - Créer un utilisateur
   - Demander une réinitialisation
   - Vérifier que le token est créé et valide
   - Utiliser le token pour changer le mot de passe
   - Vérifier que le token est marqué comme utilisé
   - Tenter de réutiliser le token → erreur

2. **Cascade Deletion**
   - Créer un utilisateur avec un token
   - Supprimer l'utilisateur
   - Vérifier que le token est également supprimé

3. **Rate Limiting**
   - Créer plusieurs demandes successives
   - Vérifier que les anciennes sont invalidées
   - Vérifier le respect du délai entre demandes

---

## Conclusion

Le modèle de données `password_reset_tokens` est :

- ✅ **Sécurisé** : Tokens hashés, expiration stricte, usage unique
- ✅ **Performant** : Index optimisés, requêtes efficaces
- ✅ **Scalable** : Fonctionne à grande échelle sans problème
- ✅ **Maintenable** : Structure simple, nettoyage automatisable
- ✅ **Conforme OWASP** : Suit toutes les recommandations de sécurité

Prêt pour l'implémentation !
