# Quickstart Guide: Password Reset Feature

**Feature**: 006-password-reset
**Date**: 2025-12-12
**For**: Developers

## Table des Matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Migration de la Base de Données](#migration-de-la-base-de-données)
5. [Développement Local](#développement-local)
6. [Tests Manuels](#tests-manuels)
7. [Débogage](#débogage)
8. [Mise en Production](#mise-en-production)

---

## Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Nuxt 4.2.1+ installé
- ✅ Node.js 18+ ou Bun
- ✅ Supabase en cours d'exécution (`supabase status`)
- ✅ Variables d'environnement de base configurées (.env)

---

## Installation

### 1. Installer Resend (service email)

```bash
bun add resend
```

### 2. Vérifier les dépendances existantes

Les dépendances suivantes sont déjà présentes dans le projet :

- ✅ `zod` - Validation des schémas
- ✅ `nuxt-auth-utils` - Gestion des sessions
- ✅ PostgreSQL (Supabase) - Base de données

---

## Configuration

### 1. Variables d'Environnement

Créez ou mettez à jour votre fichier `.env` :

```bash
# =====================================================
# Email Service (Resend)
# =====================================================
# API Key Resend (obtenir sur https://resend.com/api-keys)
RESEND_API_KEY=re_...

# Email expéditeur (doit être vérifié sur Resend)
# Pour le développement, utilisez [email protected]
RESEND_FROM_EMAIL="[email protected]"

# =====================================================
# Application
# =====================================================
# URL de base de l'application (pour les liens dans les emails)
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Mettre à jour `.env.example`

Ajoutez les variables d'environnement au fichier `.env.example` pour la documentation :

```bash
# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL="[email protected]"

# Application URL (for email links)
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Configuration Nuxt

Ajoutez la configuration Resend dans `nuxt.config.ts` :

```typescript
export default defineNuxtConfig({
  // ... configuration existante

  runtimeConfig: {
    // Private (server-only)
    resend: {
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: process.env.RESEND_FROM_EMAIL || '[email protected]',
    },

    // Public (accessible côté client)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },

    // ... reste de la configuration
  },
})
```

### 4. Obtenir une API Key Resend

**Pour le développement (gratuit)** :

1. Créer un compte sur https://resend.com
2. Aller dans **API Keys** → **Create API Key**
3. Nommer la clé (ex: "Development")
4. Copier la clé (commence par `re_...`)
5. Ajouter à votre `.env` : `RESEND_API_KEY=re_...`

**Note** : Le plan gratuit offre 3,000 emails/mois (100/jour), largement suffisant pour le développement.

---

## Migration de la Base de Données

### 1. Créer la Migration

La migration est déjà définie dans `specs/006-password-reset/data-model.md`.

Créez le fichier de migration :

```bash
# Créer le fichier de migration
touch supabase/migrations/010_password_reset_tokens.sql
```

Copiez le contenu depuis `data-model.md` ou utilisez ce SQL :

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

-- Commentaires
COMMENT ON TABLE password_reset_tokens IS
  'Stores password reset tokens with expiration and usage tracking';

COMMENT ON COLUMN password_reset_tokens.token_hash IS
  'Hashed token (format: salt:hash using scrypt) - NEVER store tokens in plain text';
```

### 2. Appliquer la Migration

```bash
# Appliquer toutes les migrations en attente
supabase db push

# Ou réinitialiser complètement (ATTENTION : supprime toutes les données)
supabase db reset
```

### 3. Vérifier la Migration

```bash
# Se connecter à la base de données
supabase db shell

# Vérifier que la table existe
\dt password_reset_tokens

# Vérifier les colonnes
\d password_reset_tokens

# Quitter
\q
```

---

## Développement Local

### 1. Démarrer Supabase

```bash
# Démarrer Supabase (si pas déjà lancé)
supabase start

# Vérifier le statut
supabase status
```

### 2. Démarrer le Serveur de Développement

```bash
bun run dev
```

L'application sera accessible sur http://localhost:3000

### 3. Créer un Utilisateur de Test

**Option 1 : Via l'interface d'inscription**
1. Aller sur http://localhost:3000/auth/register
2. S'inscrire avec un email de test

**Option 2 : Via la base de données**

```bash
supabase db shell
```

```sql
-- Créer un utilisateur de test
INSERT INTO users (id, email, name, hashed_password, created_at)
VALUES (
  'test_user_001',
  '[email protected]',
  'Test User',
  '$scrypt$N=16384,r=8,p=1$...',  -- Hash du mot de passe "password123"
  NOW()
);
```

---

## Tests Manuels

### Test 1 : Demande de Réinitialisation

**Avec curl :**

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"[email protected]"}'
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Si cet email existe, un lien de réinitialisation a été envoyé."
}
```

**Vérifier l'email :**

En développement avec Resend, les emails ne sont PAS envoyés réellement si vous utilisez un vrai email. Options :

1. **Utiliser une adresse de test Resend** (recommandé) :
   ```bash
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"[email protected]"}'
   ```

2. **Consulter les logs Resend** :
   - Aller sur https://resend.com/emails
   - Voir les emails envoyés avec leur contenu

3. **Utiliser Mailtrap pour tester** (optionnel) :
   - Créer un compte sur https://mailtrap.io
   - Configurer SMTP dans le code

### Test 2 : Vérifier le Token

**Récupérer le token depuis la base de données :**

```bash
supabase db shell
```

```sql
-- Récupérer le dernier token créé
SELECT id, user_id, expires_at, created_at, used_at
FROM password_reset_tokens
ORDER BY created_at DESC
LIMIT 1;
```

**Note** : Vous ne verrez PAS le token en clair (seulement `token_hash`), c'est normal et sécurisé.

Pour tester, utilisez le token reçu par email.

**Avec curl :**

```bash
curl -X POST http://localhost:3000/api/auth/verify-reset-token \
  -H "Content-Type: application/json" \
  -d '{"token":"K7gNU3sdo-OL0wNhqoVWhr3g6s1xYv72ol_pe_Unols"}'
```

**Réponse attendue (valide) :**
```json
{
  "isValid": true,
  "expiresAt": "2025-12-12T15:30:00.000Z"
}
```

**Réponse attendue (expiré) :**
```json
{
  "isValid": false,
  "reason": "TOKEN_EXPIRED",
  "message": "Ce lien a expiré"
}
```

### Test 3 : Réinitialiser le Mot de Passe

**Avec curl :**

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"K7gNU3sdo-OL0wNhqoVWhr3g6s1xYv72ol_pe_Unols",
    "password":"MonNouveauMotDePasse123!",
    "confirmPassword":"MonNouveauMotDePasse123!"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

**Vérifier dans la base de données :**

```sql
-- Vérifier que le token est marqué comme utilisé
SELECT id, used_at
FROM password_reset_tokens
WHERE id = 'uuid_du_token';

-- Vérifier que le mot de passe a été changé
SELECT id, email, hashed_password, updated_at
FROM users
WHERE email = '[email protected]';
```

### Test 4 : Tester le Frontend

1. Aller sur http://localhost:3000/auth/login
2. Cliquer sur "Mot de passe oublié ?"
3. Saisir un email et soumettre
4. Vérifier le message de confirmation
5. Copier le lien depuis l'email (ou logs Resend)
6. Ouvrir le lien dans le navigateur
7. Saisir un nouveau mot de passe
8. Vérifier la redirection vers /auth/login
9. Se connecter avec le nouveau mot de passe

---

## Débogage

### Logs du Serveur

Les logs s'affichent dans la console où `bun run dev` s'exécute.

**Activer les logs détaillés** (si nécessaire) :

```typescript
// server/utils/email.ts
export async function sendPasswordResetEmail(to: string, resetToken: string) {
  console.log('[Email] Sending password reset to:', to)
  console.log('[Email] Token length:', resetToken.length)

  // ... code existant

  if (error) {
    console.error('[Email] Error:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }

  console.log('[Email] Success! Message ID:', data?.id)
  return { success: true, id: data?.id }
}
```

### Vérifier les Tokens en Base de Données

```bash
supabase db shell
```

```sql
-- Voir tous les tokens (avec hashes)
SELECT id, user_id, expires_at, created_at, used_at
FROM password_reset_tokens
ORDER BY created_at DESC;

-- Compter les tokens actifs
SELECT COUNT(*) AS active_tokens
FROM password_reset_tokens
WHERE used_at IS NULL AND expires_at > NOW();

-- Compter les tokens expirés
SELECT COUNT(*) AS expired_tokens
FROM password_reset_tokens
WHERE used_at IS NULL AND expires_at <= NOW();

-- Compter les tokens utilisés
SELECT COUNT(*) AS used_tokens
FROM password_reset_tokens
WHERE used_at IS NOT NULL;
```

### Problèmes Courants

**1. Email non envoyé**
- ✅ Vérifier que `RESEND_API_KEY` est défini et valide
- ✅ Vérifier que l'email expéditeur est `[email protected]` en dev
- ✅ Consulter les logs Resend : https://resend.com/emails

**2. Token invalide**
- ✅ Vérifier que le token n'a pas expiré (< 1 heure)
- ✅ Vérifier que le token n'a pas déjà été utilisé (`used_at IS NULL`)
- ✅ Vérifier le format du token (43 caractères Base64URL)

**3. Base de données**
- ✅ Vérifier que Supabase est démarré : `supabase status`
- ✅ Vérifier que la migration a été appliquée : `supabase db shell` puis `\dt password_reset_tokens`

**4. Type errors TypeScript**
- ✅ Regénérer les types : `bun run typecheck`
- ✅ Vérifier que les interfaces TypeScript correspondent au schéma BDD

---

## Mise en Production

### 1. Variables d'Environnement Production

Configurez les variables suivantes sur votre plateforme de déploiement (Vercel, Netlify, etc.) :

```bash
# Resend API Key (production)
RESEND_API_KEY=re_prod_...

# Email expéditeur vérifié (votre domaine)
RESEND_FROM_EMAIL="noreply@votre-domaine.com"

# URL de l'application en production
NUXT_PUBLIC_SITE_URL=https://votre-domaine.com

# Base de données (Supabase production)
DATABASE_URL=postgresql://...
```

### 2. Vérifier le Domaine Email

Sur Resend (production) :
1. Aller dans **Domains**
2. Ajouter votre domaine
3. Configurer les enregistrements DNS (SPF, DKIM, DMARC)
4. Vérifier le domaine

### 3. Tester en Staging

Avant de déployer en production :

1. Déployer sur un environnement de staging
2. Tester le flux complet avec un vrai email
3. Vérifier la deliverability (inbox vs spam)
4. Vérifier les performances (temps d'envoi < 2 secondes)

### 4. Monitoring

**Logs Resend** :
- Consulter https://resend.com/emails pour voir les emails envoyés
- Vérifier le taux de delivery
- Surveiller les bounces et plaintes spam

**Base de Données** :
- Nettoyer régulièrement les tokens expirés (cron job)
- Surveiller le nombre de tokens actifs

**Exemple de cron job** (nettoyage quotidien) :

```sql
-- Supprimer les tokens expirés depuis plus de 24h
DELETE FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '24 hours';
```

### 5. Sécurité

- ✅ Activer HTTPS en production (obligatoire)
- ✅ Vérifier que `NUXT_SESSION_PASSWORD` est défini et sécurisé
- ✅ Activer le rate limiting sur les endpoints
- ✅ Configurer les CORS correctement
- ✅ Surveiller les tentatives suspectes (logs)

---

## Ressources

### Documentation

- **Resend** : https://resend.com/docs
- **Nuxt Auth Utils** : https://github.com/atinux/nuxt-auth-utils
- **OWASP Forgot Password** : https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

### Outils de Test

- **Resend Dashboard** : https://resend.com/emails
- **WebAIM Contrast Checker** : https://webaim.org/resources/contrastchecker/
- **Email Test** : https://www.mail-tester.com

### Support

- **Issues GitHub** : [Lien vers votre repo]
- **Email** : support@votre-domaine.com

---

## Checklist de Lancement

Avant de déployer en production :

- [ ] Migration de base de données appliquée
- [ ] Variables d'environnement configurées
- [ ] Domaine email vérifié sur Resend
- [ ] Tests manuels passés (forgot, verify, reset)
- [ ] Tests E2E passés
- [ ] Template email validé (contraste, accessibilité)
- [ ] Rate limiting activé
- [ ] HTTPS activé
- [ ] Monitoring configuré
- [ ] Documentation mise à jour

---

**Prêt à coder !** 🚀

Pour générer les tâches d'implémentation détaillées, exécutez :

```bash
/speckit.tasks
```
