# Research Document: Réinitialisation de Mot de Passe

**Feature**: 006-password-reset
**Date**: 2025-12-12
**Status**: Completed

## Research Questions Resolved

Ce document consolide les résultats de la recherche effectuée pour résoudre les questions techniques identifiées dans le plan d'implémentation.

---

## 1. Service d'Envoi d'Emails

### Décision

**Choix retenu : Resend**

### Rationale

Resend est la solution optimale pour ce projet Nuxt 4 car elle offre :

1. **Expérience Développeur Moderne**
   - SDK TypeScript natif (pas besoin de `@types`)
   - API simple et intuitive
   - Documentation excellente
   - Intégration rapide (< 10 minutes)

2. **Niveau Gratuit Généreux**
   - **3,000 emails/mois** (100/jour)
   - Largement suffisant pour le développement et les petits projets
   - Pas de carte de crédit requise

3. **Capacités de Test Robustes**
   - Adresses email de test intégrées :
     - `[email protected]` - Simule une livraison réussie
     - `[email protected]` - Simule un bounce
     - `[email protected]` - Simule une plainte spam
   - Historique complet des messages et logs détaillés
   - Pas d'envoi réel en développement

4. **Fiabilité et Deliverability**
   - Infrastructure moderne optimisée pour les emails transactionnels
   - Excellente réputation de domaine
   - Support HTML avancé avec React Email (optionnel)

5. **Alignement avec la Stack**
   - TypeScript natif (comme le reste du projet)
   - Pas de dépendances lourdes
   - Compatible avec l'architecture Nuxt 4

### Alternatives Considérées

**Nodemailer + SMTP**
- ❌ Configuration complexe (SMTP, authentification)
- ❌ Pas de TypeScript natif
- ❌ Pas de sandbox/test intégré
- ✅ Gratuit (bibliothèque open-source)
- **Verdict** : Trop de complexité pour peu d'avantages

**@nuxt/email ou nuxt-mail**
- ❌ Ne fonctionne pas avec SSG
- ❌ Maintenance incertaine
- ❌ Trop limité pour des cas complexes
- ✅ Intégration Nuxt native
- **Verdict** : Trop limité, ajoute une couche d'abstraction inutile

### Configuration Requise

**Dépendances :**
```bash
bun add resend
```

**Variables d'environnement :**
```bash
# .env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="[email protected]"
```

**Configuration Nuxt :**
```typescript
// nuxt.config.ts
runtimeConfig: {
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || '[email protected]',
  },
}
```

### Exemple d'Utilisation

```typescript
// server/utils/email.ts
import { Resend } from 'resend'

let resend: Resend | null = null

export function useResend() {
  if (!resend) {
    const config = useRuntimeConfig()
    resend = new Resend(config.resend.apiKey)
  }
  return resend
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const config = useRuntimeConfig()
  const resend = useResend()

  const resetUrl = `${config.public.siteUrl}/auth/reset-password?token=${resetToken}`

  const { data, error } = await resend.emails.send({
    from: config.resend.fromEmail,
    to,
    subject: 'Réinitialisation de votre mot de passe',
    html: renderPasswordResetEmailTemplate(resetUrl),
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return { success: true, id: data?.id }
}
```

---

## 2. Génération de Tokens Sécurisés

### Décision

**Choix retenu : `crypto.randomBytes()` avec encodage Base64URL**

### Rationale

1. **Sécurité Maximale**
   - 256 bits d'entropie (32 bytes) - 2× la recommandation OWASP minimum (128 bits)
   - CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) du système d'exploitation
   - 2^256 combinaisons possibles = pratiquement impossible à deviner
   - Conformité totale OWASP Forgot Password Cheat Sheet

2. **Performance Optimale**
   - Natif Node.js (module `crypto`)
   - Aucune dépendance externe
   - Extrêmement rapide (quelques millisecondes)
   - Améliorations de performance de 15.77% pour 64 bytes (Node.js PR #31519)

3. **Simplicité**
   - Génération triviale avec `randomBytes()`
   - Validation simple (comparaison directe avec BDD après hashing)
   - Révocation immédiate (simple suppression de la base de données)
   - Pas de complexité inutile (contrairement aux JWT)

4. **URL-Safe**
   - Encodage Base64URL (remplacement `+` → `-`, `/` → `_`, suppression `=`)
   - Peut être utilisé directement dans les URLs et emails
   - 43 caractères pour 32 bytes (compact)

5. **Cohérence avec le Projet**
   - Le projet utilise déjà `crypto.randomBytes()` dans :
     - `server/utils/password.ts` (génération de salt)
     - `server/utils/stripe/crypto.ts` (clés de chiffrement)

### Alternatives Considérées

**UUID v4**
- ✅ Format standardisé et reconnaissable
- ✅ URL-safe (36 caractères)
- ⚠️ Entropie légèrement inférieure (122 bits vs 256 bits)
- **Verdict** : Bonne option mais entropie moins élevée

**JWT avec expiration**
- ❌ Plus complexe (génération et vérification de signature)
- ❌ Révocation difficile (nécessite une blacklist)
- ❌ Plus long (150-250+ caractères)
- ❌ Dépendance externe requise (jsonwebtoken, jose)
- ❌ Surface d'attaque plus large
- **Verdict** : Overkill pour ce cas d'usage

### Implémentation

```typescript
import { randomBytes, timingSafeEqual, scryptSync } from 'crypto'

/**
 * Configuration pour les tokens de réinitialisation
 */
const TOKEN_CONFIG = {
  TOKEN_LENGTH_BYTES: 32,          // 256 bits d'entropie
  TOKEN_EXPIRATION_MS: 60 * 60 * 1000, // 1 heure
  RATE_LIMIT_MS: 5 * 60 * 1000,    // 5 minutes entre demandes
} as const

/**
 * Génère un token de réinitialisation de mot de passe sécurisé
 */
export function generatePasswordResetToken(): { token: string; tokenHash: string } {
  // Génération de 32 bytes aléatoires cryptographiquement sécurisés
  const tokenBytes = randomBytes(TOKEN_CONFIG.TOKEN_LENGTH_BYTES)

  // Encodage Base64URL (URL-safe)
  const token = tokenBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // Hash du token pour stockage sécurisé (ne jamais stocker en clair!)
  const tokenHash = hashToken(token)

  return { token, tokenHash }
}

/**
 * Hash un token avec scrypt (même algorithme que les mots de passe)
 */
function hashToken(token: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(token, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Vérifie un token avec protection contre les attaques par timing
 */
export function verifyPasswordResetToken(token: string, tokenHash: string): boolean {
  try {
    const [salt, hash] = tokenHash.split(':')
    if (!salt || !hash) return false

    const hashBuffer = Buffer.from(hash, 'hex')
    const verifyBuffer = scryptSync(token, salt, 64)

    if (hashBuffer.length !== verifyBuffer.length) return false

    return timingSafeEqual(hashBuffer, verifyBuffer)
  } catch {
    return false
  }
}
```

### Considérations de Sécurité

**CRITIQUE : Ne JAMAIS stocker le token en clair**
- ✅ Toujours hasher le token avant stockage (comme un mot de passe)
- ✅ Utiliser scrypt (cohérent avec le système d'authentification existant)
- ❌ Ne pas utiliser SHA-256 simple (pas conçu pour les mots de passe/tokens)

**Protection contre les attaques par timing**
- ✅ Utiliser `timingSafeEqual()` pour comparer les hashes
- ✅ Temps de réponse constant quel que soit le résultat

**Expiration et révocation**
- ✅ Expiration après 1 heure (recommandation OWASP)
- ✅ Usage unique strict (marquer comme utilisé après réinitialisation)
- ✅ Invalider tous les anciens tokens lors d'une nouvelle demande

---

## 3. Templates d'Emails HTML

### Décision

**Approche retenue : Tables HTML avec CSS inline + Dark Mode support**

### Rationale

1. **Compatibilité Maximale**
   - Les tables HTML sont supportées par tous les clients email
   - Outlook utilise Word comme moteur de rendu (pas de CSS moderne)
   - Flexbox/Grid ne sont pas supportés de manière fiable

2. **CSS Inline Obligatoire**
   - De nombreux clients suppriment les balises `<style>`
   - Gmail, Outlook et autres ignorent les feuilles de style externes
   - CSS inline garantit l'application des styles

3. **Responsive Design**
   - Largeur recommandée : **600px** (optimal pour tous les clients)
   - Media queries dans `<style>` pour le mobile (> 70% des ouvertures)
   - Images responsive avec `max-width: 100%`

4. **Support du Mode Sombre**
   - 35% des ouvertures d'emails en mode sombre (2022)
   - Media query `prefers-color-scheme: dark`
   - Classes CSS pour adapter couleurs de fond et texte

5. **Accessibilité (WCAG 2.1)**
   - Contraste texte/fond ≥ 4.5:1 (minimum)
   - Taille de police ≥ 16px
   - Alt text sur toutes les images
   - Structure sémantique (h1, p, role attributes)
   - Boutons "bulletproof" (fonctionnent même si images bloquées)

### Structure de Base

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>

  <style type="text/css">
    /* Reset CSS */
    body { margin: 0; padding: 0; }
    table { border-collapse: collapse; }
    img { border: 0; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
    }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: #1a1a1a !important; }
      .dark-text { color: #e5e5e5 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Email content (600px width) -->
      </td>
    </tr>
  </table>
</body>
</html>
```

### Bouton CTA "Bulletproof"

```html
<table role="presentation" cellspacing="0" cellpadding="0">
  <tr>
    <td style="border-radius: 6px; background-color: #3b82f6;">
      <a href="{{resetUrl}}"
         style="display: inline-block; padding: 16px 40px;
                font-family: Arial, sans-serif; font-size: 16px;
                color: #ffffff; text-decoration: none;">
        Réinitialiser mon mot de passe
      </a>
    </td>
  </tr>
</table>
```

### Checklist de Validation

- ✅ Tables pour la mise en page (pas flexbox/grid)
- ✅ CSS inline pour tous les styles critiques
- ✅ Largeur max 600px
- ✅ Poids total < 100 KB (Gmail tronque au-delà)
- ✅ Alt text sur toutes les images
- ✅ Contraste ≥ 4.5:1
- ✅ Taille police ≥ 16px
- ✅ Support mobile avec media queries
- ✅ Support dark mode
- ✅ Boutons accessibles (texte visible même si images bloquées)

### Outils de Test Recommandés

**Gratuits :**
- WebAIM Contrast Checker (contraste des couleurs)
- accessible-email.org (validation accessibilité)
- PutsMail (test d'envoi rapide)

**Payants (professionnels) :**
- Litmus ($99/mois) - Test sur 100+ clients
- Email on Acid ($99/mois) - Test sur 90+ clients

---

## 4. Analyse des Dépendances Existantes

### nuxt-auth-utils

**Version actuelle** : Utilisé pour la gestion des sessions

**Intégration** :
- Réutiliser `getUserSession()` pour vérifier l'utilisateur actuel
- Pas de session requise pour le processus de réinitialisation (endpoints publics)
- Invalider toutes les sessions après réinitialisation réussie

**Pattern observé** :
```typescript
// server/utils/session.ts
export async function getUserSession(event: H3Event) {
  return await useSession(event, { password: config.sessionPassword })
}
```

### Supabase PostgreSQL

**Migrations existantes** : 010 fichiers de migration

**Pattern observé** :
- Numérotation séquentielle : `001_`, `002_`, etc.
- Format : `NNN_description.sql`
- Utilisation de `gen_random_uuid()` pour les UUIDs
- Triggers `update_updated_at_column()` pour les timestamps

**Prochaine migration** : `010_password_reset_tokens.sql`

**Convention** :
- Index sur les colonnes de recherche fréquente
- Foreign keys avec `ON DELETE CASCADE`
- Timestamps `created_at` et `updated_at` par défaut

### Zod

**Schémas existants** : Utilisés dans tous les endpoints API

**Pattern observé** :
```typescript
// Exemple : server/api/auth/login.post.ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
```

**À créer** :
- `forgotPasswordSchema` (email uniquement)
- `resetPasswordSchema` (token + nouveau mot de passe + confirmation)

### Nuxt Content (i18n)

**Structure existante** :
```
content/i18n/
├── en/
│   ├── auth.yml
│   ├── dashboard.yml
│   └── ...
└── fr/
    ├── auth.yml
    ├── dashboard.yml
    └── ...
```

**À ajouter dans `auth.yml`** :
```yaml
forgotPassword:
  title: "Mot de passe oublié ?"
  description: "Saisissez votre email pour recevoir un lien de réinitialisation"
  emailLabel: "Adresse email"
  submit: "Envoyer le lien"
  success: "Un email a été envoyé si l'adresse existe"

resetPassword:
  title: "Nouveau mot de passe"
  description: "Choisissez un nouveau mot de passe sécurisé"
  passwordLabel: "Nouveau mot de passe"
  confirmLabel: "Confirmer le mot de passe"
  submit: "Réinitialiser"
  success: "Mot de passe réinitialisé avec succès"

errors:
  invalidToken: "Ce lien est invalide ou a expiré"
  expiredToken: "Ce lien a expiré"
  usedToken: "Ce lien a déjà été utilisé"
  mismatch: "Les mots de passe ne correspondent pas"
  tooShort: "Le mot de passe doit contenir au moins 8 caractères"
```

---

## Conclusion

Toutes les questions de recherche ont été résolues avec des décisions techniques concrètes :

1. ✅ **Service email** : Resend (TypeScript natif, 3K emails/mois gratuits, excellent DX)
2. ✅ **Génération de tokens** : `crypto.randomBytes()` + Base64URL (256 bits, OWASP-compliant)
3. ✅ **Templates email** : Tables HTML + CSS inline + Dark Mode (compatibilité maximale)
4. ✅ **Dépendances** : Patterns existants analysés et réutilisés

Le projet peut maintenant passer à la **Phase 1** : Génération des artifacts de design (data-model, contracts, quickstart).
