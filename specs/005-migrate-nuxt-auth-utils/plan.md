# Implementation Plan: Migration vers nuxt-auth-utils

**Branch**: `005-migrate-nuxt-auth-utils` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-migrate-nuxt-auth-utils/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migration de Better Auth vers nuxt-auth-utils pour simplifier l'architecture d'authentification. Remplacement du système de sessions en base de données par des sessions chiffrées en cookies, tout en préservant les données utilisateurs, rôles et abonnements Stripe existants.

**Approche technique** : Migration en parallèle (dual-auth) permettant le basculement progressif sans interruption de service, suivie du nettoyage des tables et dépendances Better Auth.

## Technical Context

**Language/Version**: TypeScript 5.9+ avec Nuxt 4.2.1, Vue 3.5, Node.js 18+
**Primary Dependencies**:
- `nuxt-auth-utils` (nouveau - gestion auth avec cookies chiffrés)
- `better-auth` v1.4.2 (à supprimer après migration)
- `@nuxt/ui` (composants)
- `stripe` (paiements - aucun changement)
- `pg` / `@supabase/supabase-js` (database)

**Storage**: PostgreSQL (Supabase self-hosted)
- Tables Better Auth actuelles : `user`, `session`, `account`, `verification`, `password`
- Tables Stripe : `user_subscriptions`, `payment_history`, `subscription_plans`, `webhook_logs`
- Nouvelles tables nuxt-auth-utils : `users` (simplifiée), `oauth_accounts` (simplifiée)
- **Note** : nuxt-auth-utils ne nécessite PAS de table `session` (cookies chiffrés)

**Testing**:
- Vitest (tests unitaires)
- Playwright (tests E2E)
- Tests manuels pour flux OAuth

**Target Platform**: Web (SSR Nuxt 4, compatible serverless/edge)

**Project Type**: Web application (Nuxt 4 full-stack)

**Performance Goals**:
- Temps de migration < 30 min pour 10K utilisateurs
- Pas de downtime pour les utilisateurs finaux
- Authentification < 200ms (amélioration vs Better Auth grâce aux cookies)

**Constraints**:
- Maintenir 100% compatibilité avec Stripe webhooks
- Préserver tous les rôles utilisateurs (User, Contributor, Admin)
- Aucune perte de données (emails, noms, dates de création)
- Support OAuth GitHub, Google, Apple sans reconfiguration

**Scale/Scope**:
- ~100-1000 utilisateurs actuels (estimation)
- 3 providers OAuth (GitHub, Google, Apple)
- 1 système de paiement (Stripe)
- ~15 composables/middleware à migrer
- ~10 pages/formulaires à adapter

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

La constitution n'étant pas définie (fichier template), nous appliquons les principes standards du projet Nuxt :

**✅ Type Safety**: Migration complète en TypeScript avec types stricts
**✅ Nuxt Best Practices**: Utilisation de composables, middleware, server routes
**✅ No Breaking Changes**: Migration transparente pour l'utilisateur final
**✅ Data Integrity**: Backup + validation avant suppression des anciennes tables
**✅ Security**: Sessions chiffrées AES-GCM, CSRF protection, secure cookies
**✅ Testing**: Tests unitaires + E2E pour tous les flux critiques
**✅ Documentation**: Documentation de migration + quickstart pour développeurs

**Décisions architecturales** :
1. **Dual-auth temporaire** : Better Auth et nuxt-auth-utils coexistent pendant migration
2. **Feature flag** : Basculement contrôlé via variable d'environnement
3. **Rollback plan** : Conservation de Better Auth jusqu'à validation complète

## Project Structure

### Documentation (this feature)

```text
specs/005-migrate-nuxt-auth-utils/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Décisions techniques détaillées
├── data-model.md        # Phase 1 output - Schéma DB avant/après migration
├── quickstart.md        # Phase 1 output - Guide migration pour devs
└── contracts/           # Phase 1 output - API contracts (optionnel)
```

### Source Code (repository root)

```text
# Structure Nuxt 4 existante (mono-projet)

server/
├── utils/
│   ├── auth.ts                    # [TO REPLACE] Better Auth config
│   ├── nuxt-auth.ts               # [NEW] nuxt-auth-utils config
│   └── database/
│       ├── users.ts               # [TO UPDATE] User queries
│       └── oauth.ts               # [NEW] OAuth account queries
├── api/
│   ├── auth/
│   │   ├── [...]                  # [BETTER AUTH ROUTES - TO REMOVE]
│   │   ├── login.post.ts          # [NEW] nuxt-auth-utils email/password
│   │   ├── register.post.ts       # [NEW]
│   │   ├── logout.post.ts         # [NEW]
│   │   └── github.get.ts          # [NEW] OAuth routes (GitHub, Google, Apple)
│   ├── admin/
│   │   └── users/
│   │       ├── index.get.ts       # [TO UPDATE] Query nuxt-auth-utils sessions
│   │       └── [id]/role.patch.ts # [NO CHANGE] Role management
│   └── subscriptions/
│       └── webhook.post.ts        # [TO UPDATE] Stripe webhook (user lookup)
└── middleware/
    └── migration.ts               # [NEW TEMP] Dual-auth router

app/
├── composables/
│   ├── useAuth.ts                 # [TO REPLACE] Auth composable
│   ├── useRole.ts                 # [TO UPDATE] Role checks
│   └── useSubscription.ts         # [TO UPDATE] Subscription status
├── middleware/
│   ├── auth.ts                    # [TO UPDATE] Auth guard
│   ├── admin.ts                   # [TO UPDATE] Admin guard
│   ├── contributor.ts             # [TO UPDATE] Contributor guard
│   └── guest.ts                   # [TO UPDATE] Guest-only guard
├── components/
│   ├── auth/
│   │   ├── LoginForm.vue          # [TO UPDATE] Login form
│   │   ├── SignupForm.vue         # [TO UPDATE] Signup form
│   │   └── SocialButtons.vue      # [TO UPDATE] OAuth buttons
│   └── subscription/
│       └── SubscriptionCard.vue   # [TO UPDATE] User lookup
└── pages/
    ├── login.vue                  # [TO UPDATE] Login page
    ├── signup.vue                 # [TO UPDATE] Signup page
    └── admin/
        └── users.vue              # [TO UPDATE] Admin panel

supabase/migrations/
├── 001_better_auth_init.sql       # [EXISTING] Better Auth tables
├── 20251208153734_stripe_subscriptions.sql # [EXISTING] Stripe tables
└── 006_nuxt_auth_utils_migration.sql # [NEW] Migration SQL script

lib/
├── auth-client.ts                 # [TO REMOVE] Better Auth client
└── password.ts                    # [NEW] Password hashing utils (scrypt)

test/
├── nuxt/
│   ├── composables/
│   │   └── useAuth.spec.ts        # [TO UPDATE] Auth composable tests
│   └── middleware/
│       └── auth.spec.ts           # [TO UPDATE] Middleware tests
└── e2e/
    ├── auth-flow.spec.ts          # [TO UPDATE] Login/signup E2E
    └── oauth-flow.spec.ts         # [NEW] OAuth E2E tests
```

**Structure Decision**: Mono-projet Nuxt 4 avec séparation claire server/app. Les fichiers Better Auth seront supprimés après migration complète. Une phase de transition (dual-auth) permettra le rollback si nécessaire.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Aucune violation de la constitution standard. La migration ajoute temporairement une complexité (dual-auth) mais celle-ci sera supprimée après validation.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

## Phase 0: Research & Technical Decisions

**Objective**: Résoudre toutes les questions techniques ouvertes avant de démarrer la conception.

**Voir**: `research.md` (sera généré à l'étape suivante)

**Questions clés à résoudre** :
1. Comment migrer les hash de mots de passe Better Auth (bcrypt) vers nuxt-auth-utils (scrypt) ?
2. Quelle stratégie pour gérer les sessions actives pendant la migration ?
3. Comment préserver les associations OAuth multi-provider ?
4. Quel schéma DB minimal pour nuxt-auth-utils avec Stripe ?
5. Comment implémenter le système de rôles (User/Contributor/Admin) ?
6. Quelle approche pour la feature flag de basculement ?

## Phase 1: Data Model & API Contracts

**Objective**: Définir le schéma de données et les contrats d'API.

### Deliverables

1. **data-model.md** :
   - Schéma Better Auth (actuel)
   - Schéma nuxt-auth-utils (cible)
   - Mapping de migration
   - Script SQL de migration

2. **contracts/** (optionnel) :
   - API auth : login, register, logout, OAuth
   - API admin : user management
   - API subscription : Stripe webhooks

3. **quickstart.md** :
   - Guide d'installation pour développeurs
   - Configuration environnement
   - Tests de validation post-migration

### Data Entities (from spec)

**User** :
- Attributs : id, email, nom, rôle, stripe_customer_id, dates
- Relations : OAuth accounts (1:N), Subscriptions (1:N)

**OAuth Account** :
- Attributs : provider, providerId, userId, tokens
- Relations : User (N:1)

**Session** :
- Better Auth : Table `session` avec token en DB
- nuxt-auth-utils : Cookie chiffré (pas de table)

**Subscription** :
- Aucun changement (table Stripe existante)
- Relation avec User via `user_id`

## Phase 2: Task Breakdown

**NOT CREATED BY THIS COMMAND** - Generated by `/speckit.tasks`

The tasks.md file will be created in the next phase and will contain:
- Installation et setup nuxt-auth-utils
- Migration du schéma database
- Migration des composables et middleware
- Migration des composants UI
- Tests et validation
- Cleanup Better Auth
- Documentation

## Migration Strategy

### Approche : Dual-Auth avec Feature Flag

**Phase 1 - Setup (Jours 1-3)** :
1. Installer nuxt-auth-utils à côté de Better Auth
2. Créer nouvelles tables (`users_new`, `oauth_accounts_new`)
3. Implémenter nouveaux endpoints `/api/auth/v2/*`
4. Ajouter feature flag `USE_NUXT_AUTH_UTILS`

**Phase 2 - Migration Data (Jours 4-5)** :
1. Script de migration : copier `user` → `users_new`
2. Migrer `account` → `oauth_accounts_new`
3. Convertir hashes bcrypt → scrypt (rehash au prochain login)
4. Valider intégrité (checksums, counts)

**Phase 3 - Migration Code (Jours 6-10)** :
1. Migrer composables (`useAuth`, `useRole`)
2. Migrer middleware (`auth`, `admin`, etc.)
3. Migrer composants (LoginForm, SignupForm, etc.)
4. Mettre à jour API Stripe webhook

**Phase 4 - Testing (Jours 11-14)** :
1. Tests unitaires (composables, utils)
2. Tests E2E (login, signup, OAuth)
3. Tests manuels (tous les providers OAuth)
4. Tests de charge (performance)

**Phase 5 - Cutover (Jour 15)** :
1. Activer feature flag en production
2. Monitoring intensif (erreurs, latence)
3. Rollback plan prêt (désactiver flag)

**Phase 6 - Cleanup (Jours 16-21)** :
1. Supprimer Better Auth (code + dépendances)
2. Renommer `users_new` → `users`
3. Supprimer anciennes tables Better Auth
4. Mettre à jour documentation

### Rollback Plan

Si problème détecté après cutover :
1. Désactiver `USE_NUXT_AUTH_UTILS` (env var)
2. Redémarrer app (retour à Better Auth)
3. Investiguer logs et erreurs
4. Corriger puis retenter cutover

**Durée rollback** : < 5 minutes (redémarrage app)

## Risk Mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Perte de sessions actives | Haut | Moyen | Dual-auth + migration graduelle |
| Incompatibilité hash passwords | Moyen | Faible | Rehash au prochain login |
| Erreurs OAuth multi-provider | Moyen | Moyen | Tests approfondis avant cutover |
| Stripe webhook cassé | Haut | Faible | Tests webhook en staging |
| Migration DB échoue | Haut | Faible | Backup + dry-run + validation |

## Success Metrics

Référence : Success Criteria du spec.md

- **SC-001** : 100% taux de login après migration (mesuré : logs auth)
- **SC-002** : 0 perte de données (mesuré : count rows avant/après)
- **SC-003** : Interruption < 5 min (mesuré : uptime monitoring)
- **SC-004** : 0 dépendance Better Auth (mesuré : package.json + grep codebase)
- **SC-005** : Migration < 30 min pour 10K users (mesuré : temps script)
- **SC-006** : Nouveaux comptes créés immédiatement (mesuré : tests E2E)
- **SC-007** : Stripe webhooks 100% fonctionnels (mesuré : webhook logs)
- **SC-008** : Taux erreur < 0.1% (mesuré : error tracking)

## Next Steps

Après validation de ce plan :

1. **Execute Phase 0** : Lancer les agents de recherche → `research.md`
2. **Execute Phase 1** : Générer `data-model.md` + `contracts/` + `quickstart.md`
3. **Update Agent Context** : Mettre à jour CLAUDE.md avec nuxt-auth-utils
4. **Generate Tasks** : Exécuter `/speckit.tasks` pour créer `tasks.md`
5. **Implement** : Exécuter `/speckit.implement` pour démarrer le développement
