# Implementation Plan: Réinitialisation de Mot de Passe

**Branch**: `006-password-reset` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-password-reset/spec.md`

## Summary

Implémenter un parcours complet de réinitialisation de mot de passe permettant aux utilisateurs d'obtenir un lien sécurisé par email pour définir un nouveau mot de passe. Le système génère des tokens uniques avec expiration d'1 heure, invalide automatiquement les anciens tokens lors de nouvelles demandes, et maintient la sécurité en évitant l'énumération des emails. L'approche technique utilise la stack Nuxt 4 existante avec PostgreSQL pour le stockage des tokens, nodemailer/resend pour l'envoi d'emails, et nuxt-auth-utils pour l'intégration avec le système d'authentification actuel.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Nuxt 4.2.1, Vue 3.5, Node.js 18+
**Primary Dependencies**:
- `nuxt-auth-utils` for session management integration
- `resend` for email sending (decision documented in research.md)
- `zod` for schema validation
- `@nuxt/ui` for UI components

**Storage**: PostgreSQL (self-hosted Supabase) - nouvelle table `password_reset_tokens`
**Testing**: Vitest for unit tests, Playwright for E2E tests
**Target Platform**: Web (Nuxt 4 SSR application)
**Project Type**: Web application (Nuxt 4 full-stack)
**Performance Goals**:
- Email envoyé en moins de 2 secondes
- Validation de token en moins de 200ms
- Page de réinitialisation chargée en moins de 1 seconde

**Constraints**:
- Tokens doivent expirer après exactement 1 heure
- Maximum 100 tokens actifs par utilisateur (soft limit pour éviter spam)
- Compatibilité avec le système de hachage scrypt existant
- Messages d'erreur identiques que l'email existe ou non (anti-enumération)

**Scale/Scope**:
- Support de milliers d'utilisateurs
- ~5 nouvelles routes/endpoints
- 2 nouvelles pages frontend
- 1 nouvelle table database
- 3 nouveaux composables

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Note**: La constitution du projet est vide (template). Les principes suivants sont déduits de l'architecture existante :

### Principes Architecturaux Observés

✅ **Consistance avec l'existant**:
- Suivre les patterns existants de nuxt-auth-utils
- Utiliser la même structure de validation Zod
- Respecter la convention i18n avec Nuxt Content
- Utiliser les composants Nuxt UI

✅ **Sécurité par défaut**:
- Hachage des mots de passe avec scrypt (existant)
- Tokens cryptographiquement sécurisés
- Protection anti-enumération
- Validation stricte côté serveur

✅ **Tests obligatoires**:
- Tests unitaires pour les utilitaires serveur
- Tests E2E pour les flux utilisateur complets
- Tests d'intégration pour les endpoints API

✅ **Accessibilité et UX**:
- Tous les formulaires accessibles (ARIA)
- Messages d'erreur traduits (i18n)
- États de chargement clairs
- Notifications toast cohérentes

**Status**: ✅ PASSED - Aucune violation détectée

## Project Structure

### Documentation (this feature)

```text
specs/006-password-reset/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (email service selection)
├── data-model.md        # Phase 1 output (password_reset_tokens schema)
├── quickstart.md        # Phase 1 output (dev setup guide)
├── contracts/           # Phase 1 output (API contracts)
│   └── password-reset-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── pages/
│   ├── auth/
│   │   ├── forgot-password.vue       # NEW: Page de demande de réinitialisation
│   │   └── reset-password.vue        # NEW: Page de création nouveau mot de passe
│   └── login.vue                     # MODIFIED: Ajouter lien "Mot de passe oublié"
│
├── components/
│   └── auth/
│       ├── ForgotPasswordForm.vue    # NEW: Formulaire demande de reset
│       └── ResetPasswordForm.vue     # NEW: Formulaire nouveau mot de passe
│
└── composables/
    ├── usePasswordReset.ts           # NEW: Composable pour gestion reset
    └── useAuth.ts                    # MODIFIED: Ajouter helpers reset si nécessaire

server/
├── api/
│   └── auth/
│       ├── forgot-password.post.ts   # NEW: Endpoint demande de reset
│       ├── reset-password.post.ts    # NEW: Endpoint confirmation reset
│       └── verify-reset-token.post.ts # NEW: Endpoint validation token
│
├── utils/
│   ├── database/
│   │   ├── users.ts                  # MODIFIED: Ajouter updatePassword()
│   │   └── password-reset-tokens.ts  # NEW: CRUD pour tokens
│   ├── password.ts                   # EXISTS: Réutiliser hashPassword()
│   ├── email.ts                      # NEW: Email sending utilities
│   └── crypto.ts                     # NEW: Token generation utilities
│
└── templates/
    └── email/
        └── password-reset.html       # NEW: Template email HTML

supabase/
└── migrations/
    └── 010_password_reset_tokens.sql # NEW: Création table reset tokens

content/
└── i18n/
    ├── en/
    │   └── auth.yml                  # MODIFIED: Ajouter traductions reset
    └── fr/
        └── auth.yml                  # MODIFIED: Ajouter traductions reset

tests/
├── unit/
│   └── server/
│       ├── password-reset-tokens.test.ts # NEW: Tests CRUD tokens
│       ├── crypto.test.ts                # NEW: Tests génération tokens
│       └── email.test.ts                 # NEW: Tests envoi emails (mocked)
│
└── e2e/
    └── password-reset.test.ts        # NEW: Tests E2E flux complet
```

**Structure Decision**: Web application (Nuxt 4 full-stack). Nous suivons la structure existante avec :
- Pages dans `app/pages/auth/` pour cohérence avec login/register
- Composants réutilisables dans `app/components/auth/`
- API endpoints dans `server/api/auth/` pour regrouper toutes les routes d'authentification
- Utilitaires serveur dans `server/utils/` avec séparation database/business logic
- Tests organisés par type (unit/e2e) comme l'infrastructure existante

## Complexity Tracking

> Aucune violation de la constitution détectée. Cette section est laissée vide.

## Phase 0: Research & Unknowns

### Research Tasks

1. **Email Service Selection** (NEEDS CLARIFICATION)
   - **Question**: Quel service d'email utiliser ? `nodemailer` avec SMTP, `resend`, ou `@nuxt/email` ?
   - **Options à évaluer**:
     - Nodemailer + SMTP (Gmail, SendGrid, etc.)
     - Resend (service moderne avec bon DX)
     - @nuxt/email (intégration Nuxt native)
   - **Critères de décision**:
     - Coût (gratuit en dev)
     - DX (facilité d'intégration)
     - Fiabilité de délivrabilité
     - Support HTML templates
   - **Output attendu**: Choix documenté dans `research.md`

2. **Token Generation Strategy**
   - **Question**: Quelle approche pour générer des tokens sécurisés ?
   - **Options à évaluer**:
     - `crypto.randomBytes()` + Base64URL encoding
     - UUID v4
     - JWT avec expiration (overkill ?)
   - **Critères de décision**:
     - Sécurité cryptographique
     - Unicité garantie
     - Facilité de validation
     - URL-safe
   - **Output attendu**: Pattern documenté avec exemple de code

3. **Email Template Best Practices**
   - **Question**: Comment structurer les templates d'email pour compatibilité multi-clients ?
   - **Recherche**:
     - Bonnes pratiques HTML email (tables, CSS inline)
     - Compatibilité Gmail/Outlook/Apple Mail
     - Templates Nuxt/Vue existants
   - **Output attendu**: Template de base réutilisable

### Dependencies Analysis

- **nuxt-auth-utils**: Étudier l'intégration avec le système existant (session, user context)
- **Supabase PostgreSQL**: Patterns de migration existants, conventions de nommage
- **Zod**: Schémas de validation existants pour s'aligner sur les patterns
- **Nuxt Content i18n**: Structure des fichiers de traduction existants

## Phase 1: Design Artifacts

_Ces fichiers seront générés après la recherche Phase 0:_

### 1. data-model.md

Contiendra le schéma détaillé de :
- **Table `password_reset_tokens`**:
  - Champs, types, contraintes
  - Index pour performance
  - Relations avec table `users`
  - TTL (Time To Live) strategy

### 2. contracts/password-reset-api.yaml

OpenAPI 3.0 specification pour :
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-token`
- `POST /api/auth/reset-password`

Avec schémas de requête/réponse, codes d'erreur, exemples.

### 3. quickstart.md

Guide de développement incluant :
- Configuration de l'email service en local
- Variables d'environnement requises
- Seeds de test pour la database
- Exemples de test manuel (curl/Postman)

## Next Steps

Après validation de ce plan :

1. **Exécuter Phase 0**: Résoudre les clarifications et créer `research.md`
2. **Exécuter Phase 1**: Générer les artifacts de design (data-model, contracts, quickstart)
3. **Mettre à jour le contexte agent**: Runner le script d'update pour ajouter les nouvelles technos
4. **Exécuter `/speckit.tasks`**: Générer le breakdown détaillé des tâches d'implémentation

---

**Status**: ✅ Phase 0 et Phase 1 complétées - Prêt pour `/speckit.tasks`

## Phase Completion Summary

### Phase 0: Research (✅ Completed)

Toutes les questions de recherche ont été résolues et documentées dans `research.md`:

1. ✅ **Service d'email** : Resend sélectionné (TypeScript natif, 3K emails/mois gratuits, excellent DX)
2. ✅ **Génération de tokens** : `crypto.randomBytes()` + Base64URL (256 bits d'entropie, OWASP-compliant)
3. ✅ **Templates email** : Tables HTML + CSS inline + Dark Mode support (compatibilité maximale)
4. ✅ **Analyse des dépendances** : Patterns existants identifiés et réutilisables

### Phase 1: Design Artifacts (✅ Completed)

Tous les artifacts de design ont été générés :

1. ✅ **data-model.md** : Schéma complet de la table `password_reset_tokens` avec indexes, contraintes, et stratégies TTL
2. ✅ **contracts/password-reset-api.yaml** : Spécification OpenAPI 3.0 pour les 3 endpoints (forgot-password, verify-reset-token, reset-password)
3. ✅ **quickstart.md** : Guide de développement avec configuration, migration, tests manuels, et débogage
4. ✅ **Agent Context Updated** : CLAUDE.md mis à jour avec les nouvelles technologies
