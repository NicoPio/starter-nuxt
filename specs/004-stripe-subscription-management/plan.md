# Implementation Plan: Stripe Subscription Management with Simplified Admin Configuration

**Branch**: `004-stripe-subscription-management` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-stripe-subscription-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implémentation d'un système complet de gestion d'abonnements Stripe pour une plateforme SaaS Nuxt.js 4. La feature permet aux administrateurs de configurer Stripe via un assistant simplifié, de créer et gérer des offres d'abonnement qui sont automatiquement synchronisées avec Stripe, et aux utilisateurs de s'abonner via Stripe Checkout avec gestion complète de leur abonnement (historique, factures, annulation). Le système utilise les webhooks Stripe pour maintenir la synchronisation automatique des statuts d'abonnement.

**Approche technique** : Architecture server-side Nuxt avec API routes pour l'intégration Stripe, composants Vue 3 avec Composition API pour l'interface utilisateur, stockage PostgreSQL (Supabase) pour les données d'abonnement, et système de webhooks sécurisé pour la synchronisation temps réel avec Stripe.

## Technical Context

**Language/Version**: TypeScript 5.9+ avec Nuxt 4.2.1, Vue 3.5, Node.js 18+
**Primary Dependencies**:
- `stripe` (SDK Node.js officiel Stripe)
- Better Auth (authentification existante)
- Nuxt UI (composants UI)
- Zod (validation de schémas)
- PostgreSQL via Supabase (base de données existante)

**Storage**: PostgreSQL (Supabase self-hosted) avec nouvelles tables :
- `stripe_configuration` (clés API, mode)
- `subscription_plans` (offres d'abonnement)
- `user_subscriptions` (abonnements utilisateurs)
- `payment_history` (historique des paiements)
- `webhook_logs` (logs des événements Stripe)

**Testing**:
- Vitest (tests unitaires existants)
- Playwright (tests E2E existants)
- Stripe Testing Mode (cartes de test)
- Stripe CLI pour simulation de webhooks en local

**Target Platform**: Application web Nuxt.js SSR/SSG déployée sur serveur avec connexion PostgreSQL

**Project Type**: Web application (Nuxt.js full-stack avec server routes)

**Performance Goals**:
- Création de checkout session < 500ms
- Traitement webhook < 3 secondes
- Chargement page d'abonnements < 1 seconde
- Support de 1000 abonnements actifs simultanés

**Constraints**:
- Webhooks Stripe doivent répondre en < 5 secondes (timeout Stripe)
- Clés API Stripe doivent être chiffrées au repos
- Conformité PCI DSS via Stripe Checkout (pas de manipulation directe de cartes)
- Idempotence obligatoire sur traitement des webhooks (gestion des retries Stripe)
- RGPD : suppression des données Stripe lors de suppression de compte utilisateur

**Scale/Scope**:
- 1000+ abonnements actifs
- Support multi-devises (configuré dans Stripe)
- 6 user stories (3 P1, 2 P2, 1 P3)
- 47 exigences fonctionnelles
- 5 nouvelles tables PostgreSQL
- ~15-20 nouveaux composants Vue
- ~10-12 API routes serveur

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Note**: Le fichier constitution.md est un template vide. Aucune règle spécifique de projet n'est définie actuellement. La validation se fera donc sur les principes généraux de qualité et les contraintes décrites dans CLAUDE.md.

### Validation des principes généraux :

✅ **Architecture Nuxt 4** : Respect de l'architecture existante (server routes, composables, auto-imports)
✅ **Better Auth Integration** : Utilisation de l'authentification existante, pas de duplication
✅ **TypeScript Strict** : Tous les fichiers en TypeScript avec typage strict
✅ **Nuxt UI Components** : Utilisation des composants Nuxt UI existants (UCard, UButton, UForm, etc.)
✅ **Security Best Practices** : Clés API chiffrées, validation des webhooks, HTTPS obligatoire
✅ **No Backward Compatibility Hacks** : Nouvelle feature, pas de code legacy à maintenir
✅ **Testing Strategy** : Tests unitaires (Vitest) + E2E (Playwright) comme dans 003-testing-infrastructure
✅ **Composables over Mixins** : Utilisation exclusive de composables Vue 3 Composition API
✅ **Server-side Security** : Clés API Stripe stockées côté serveur uniquement, jamais exposées au client

### Points nécessitant attention :

⚠️ **Database Migrations** : Nouvelles tables à créer via Supabase migrations
⚠️ **Webhook Endpoint Security** : Validation de signature Stripe obligatoire
⚠️ **Environment Variables** : Gestion des clés API Stripe en variables d'environnement + base de données chiffrée

**Status**: ✅ Constitution check passed - Prêt pour Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/004-stripe-subscription-management/
├── spec.md                    # Spécification complète (existant)
├── plan.md                    # Ce fichier - Plan d'implémentation
├── research.md                # Phase 0 output - Recherche technique
├── data-model.md              # Phase 1 output - Modèle de données PostgreSQL
├── quickstart.md              # Phase 1 output - Guide de démarrage rapide
├── contracts/                 # Phase 1 output - Contrats API
│   ├── api-routes.yaml        # OpenAPI spec pour les routes serveur
│   └── stripe-events.yaml     # Spec des événements webhook Stripe
├── checklists/                # Checklists de validation
│   └── requirements.md        # Checklist de qualité de la spec (existant)
└── tasks.md                   # Phase 2 output - Liste des tâches d'implémentation
```

### Source Code (repository root)

```text
# Structure Nuxt.js 4 existante adaptée pour Stripe

app/
├── components/
│   ├── admin/
│   │   ├── stripe/
│   │   │   ├── ConfigurationForm.vue        # Formulaire de config Stripe
│   │   │   ├── ConfigurationWizard.vue      # Assistant simplifié
│   │   │   ├── ConnectionStatus.vue         # Indicateur de statut
│   │   │   └── MigrationChecklist.vue       # Checklist test→production
│   │   └── subscriptions/
│   │       ├── PlanForm.vue                 # Formulaire création/édition plan
│   │       ├── PlanList.vue                 # Liste des plans
│   │       ├── PlanCard.vue                 # Card d'affichage d'un plan
│   │       ├── PlanSyncButton.vue           # Bouton sync depuis Stripe
│   │       └── PlanMetrics.vue              # Métriques (abonnés, MRR)
│   └── user/
│       └── subscriptions/
│           ├── PlanSelector.vue             # Sélection d'un plan
│           ├── SubscriptionCard.vue         # Card abonnement actif
│           ├── PaymentHistory.vue           # Historique de paiements
│           ├── InvoiceDownload.vue          # Téléchargement facture
│           └── CancelDialog.vue             # Dialog d'annulation
│
├── composables/
│   ├── useStripeConfig.ts                   # Gestion config Stripe (admin)
│   ├── useSubscriptionPlans.ts              # Gestion des plans (admin)
│   ├── useUserSubscription.ts               # Gestion abonnement utilisateur
│   └── usePaymentHistory.ts                 # Historique de paiements
│
├── pages/
│   ├── admin/
│   │   ├── stripe/
│   │   │   ├── index.vue                    # Page config Stripe
│   │   │   └── wizard.vue                   # Page assistant simplifié
│   │   └── subscriptions/
│   │       ├── index.vue                    # Liste des plans
│   │       ├── new.vue                      # Création plan
│   │       └── [id]/edit.vue                # Édition plan
│   ├── subscriptions/
│   │   ├── index.vue                        # Page sélection plan (user)
│   │   ├── success.vue                      # Page confirmation paiement
│   │   └── cancel.vue                       # Page annulation paiement
│   └── dashboard/
│       └── subscription.vue                 # Page gestion abonnement (user)
│
├── middleware/
│   └── stripe-configured.ts                 # Vérifie que Stripe est configuré
│
├── types/
│   └── stripe.types.ts                      # Types TypeScript pour Stripe
│
└── utils/
    └── stripe.ts                            # Utilitaires Stripe (masquage clés, etc.)

server/
├── api/
│   ├── admin/
│   │   ├── stripe/
│   │   │   ├── config.get.ts                # GET config Stripe
│   │   │   ├── config.post.ts               # POST/PUT config Stripe
│   │   │   └── test-connection.post.ts      # POST test connexion
│   │   └── subscription-plans/
│   │       ├── index.get.ts                 # GET liste plans
│   │       ├── index.post.ts                # POST nouveau plan
│   │       ├── [id].get.ts                  # GET plan par ID
│   │       ├── [id].put.ts                  # PUT update plan
│   │       ├── [id].delete.ts               # DELETE plan
│   │       └── sync.post.ts                 # POST sync depuis Stripe
│   ├── subscriptions/
│   │   ├── plans.get.ts                     # GET plans publics (user)
│   │   ├── checkout.post.ts                 # POST créer session checkout
│   │   ├── current.get.ts                   # GET abonnement actuel user
│   │   ├── cancel.post.ts                   # POST annuler abonnement
│   │   ├── reactivate.post.ts               # POST réactiver abonnement
│   │   └── portal.post.ts                   # POST créer portal session
│   ├── payments/
│   │   ├── history.get.ts                   # GET historique paiements
│   │   └── invoice/[id].get.ts              # GET facture PDF
│   └── webhooks/
│       └── stripe.post.ts                   # POST webhook Stripe
│
├── utils/
│   ├── stripe/
│   │   ├── client.ts                        # Client Stripe serveur
│   │   ├── config.ts                        # Gestion config (load/save)
│   │   ├── products.ts                      # Gestion Products Stripe
│   │   ├── prices.ts                        # Gestion Prices Stripe
│   │   ├── customers.ts                     # Gestion Customers Stripe
│   │   ├── subscriptions.ts                 # Gestion Subscriptions Stripe
│   │   ├── checkout.ts                      # Gestion Checkout Sessions
│   │   ├── webhooks.ts                      # Traitement webhooks
│   │   └── crypto.ts                        # Chiffrement clés API
│   └── database/
│       └── stripe.ts                        # Requêtes DB pour tables Stripe
│
└── middleware/
    └── admin-only.ts                        # Middleware admin (existant)

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_stripe_subscriptions.sql  # Migration tables Stripe

test/
├── unit/
│   ├── composables/
│   │   ├── useStripeConfig.spec.ts
│   │   ├── useSubscriptionPlans.spec.ts
│   │   └── useUserSubscription.spec.ts
│   └── server/
│       └── utils/
│           └── stripe/
│               ├── crypto.spec.ts
│               ├── webhooks.spec.ts
│               └── config.spec.ts
└── e2e/
    ├── admin-stripe-config.spec.ts          # Test configuration admin
    ├── admin-subscription-plans.spec.ts     # Test gestion plans
    ├── user-subscription-flow.spec.ts       # Test souscription utilisateur
    └── webhooks-sync.spec.ts                # Test webhooks (avec Stripe CLI)

content/
└── i18n/
    ├── en/
    │   └── stripe.yml                       # Traductions anglais Stripe
    └── fr/
        └── stripe.yml                       # Traductions français Stripe
```

**Structure Decision**:

Nous utilisons la structure Nuxt.js 4 full-stack existante avec :
- **app/** pour le code front-end (composants, pages, composables Vue 3)
- **server/** pour le code back-end (API routes, utils serveur)
- **supabase/migrations/** pour les migrations de base de données
- **test/** pour les tests unitaires et E2E

Cette structure respecte les conventions Nuxt 4 et s'intègre parfaitement avec l'architecture existante du projet (Better Auth, Nuxt UI, Supabase).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Aucune violation détectée. La feature s'intègre dans l'architecture existante sans ajouter de complexité injustifiée.

## Phase 0: Research & Technical Decisions

_Output: research.md with all decisions documented_

### Research Topics to Address:

1. **Stripe SDK Integration in Nuxt.js SSR**
   - Best practices pour instancier le client Stripe côté serveur
   - Gestion du cache des clés API en mémoire vs rechargement depuis DB
   - Pattern singleton pour le client Stripe

2. **Webhook Security & Idempotency**
   - Validation de signature Stripe avec `stripe.webhooks.constructEvent`
   - Stratégie d'idempotence : table `webhook_logs` avec `event_id` unique
   - Gestion des retries Stripe (délai exponentiel)
   - Queue de traitement asynchrone vs traitement synchrone

3. **Stripe Checkout vs Payment Intents**
   - Stripe Checkout Session (recommandé) : hosted page, PCI DSS compliant
   - Payment Intents : plus de contrôle mais nécessite plus de code
   - **Decision préliminaire** : Checkout Session pour simplicité et sécurité

4. **Database Encryption for API Keys**
   - Chiffrement AES-256 pour clés API Stripe
   - Stockage de la clé de chiffrement : variable d'environnement `STRIPE_ENCRYPTION_KEY`
   - Alternative : stockage uniquement en variables d'environnement (pas de DB)

5. **Synchronization Strategy**
   - Webhooks as source of truth
   - Polling de Stripe en fallback (optionnel)
   - Gestion des états transitoires (paiement en cours)

6. **Stripe Customer Portal Integration**
   - Utilisation du Customer Portal Stripe pour gestion méthode de paiement
   - Configuration depuis tableau de bord Stripe
   - Génération de session portal côté serveur

7. **Multi-Currency Support**
   - Stripe supporte multi-devises mais un Price = une devise
   - Stratégie : un plan par devise vs sélection devise à la souscription
   - **Decision préliminaire** : Devise unique (EUR par défaut), extensible plus tard

8. **Testing Strategy avec Stripe**
   - Utilisation de Stripe Test Mode avec clés test
   - Cartes de test Stripe (4242 4242 4242 4242, etc.)
   - Stripe CLI pour webhooks en local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Fixtures Stripe pour tests unitaires

9. **Error Handling & Retry Logic**
   - Gestion des erreurs réseau Stripe (timeouts, rate limits)
   - Retry avec backoff exponentiel pour appels API Stripe
   - Logging structuré des erreurs Stripe

10. **Nuxt UI Components for Forms**
    - UForm avec Zod validation pour formulaires
    - UCard pour affichage des plans et abonnements
    - UButton avec états loading
    - UModal pour dialogs de confirmation

**Action**: Créer `research.md` avec agents de recherche pour chaque topic.

## Phase 1: Design Artifacts

_Output: data-model.md, contracts/, quickstart.md_

### 1. Data Model (data-model.md)

**Tables PostgreSQL** :

- `stripe_configuration` : Configuration globale Stripe
- `subscription_plans` : Plans d'abonnement (sync avec Stripe Products/Prices)
- `user_subscriptions` : Abonnements utilisateurs (sync avec Stripe Subscriptions)
- `payment_history` : Historique des paiements (sync avec Stripe Invoices)
- `webhook_logs` : Logs des événements webhook reçus

**Schéma détaillé** : À définir dans `data-model.md`

### 2. API Contracts (contracts/)

**contracts/api-routes.yaml** : Spécification OpenAPI des routes serveur

Routes principales :
- `GET /api/admin/stripe/config`
- `POST /api/admin/stripe/config`
- `POST /api/admin/stripe/test-connection`
- `GET /api/admin/subscription-plans`
- `POST /api/admin/subscription-plans`
- `GET /api/subscriptions/plans`
- `POST /api/subscriptions/checkout`
- `POST /api/subscriptions/cancel`
- `GET /api/payments/history`
- `POST /api/webhooks/stripe`

**contracts/stripe-events.yaml** : Événements webhook Stripe supportés

Événements :
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`

### 3. Quickstart Guide (quickstart.md)

Guide de démarrage rapide pour les développeurs :
1. Configuration environnement (clés Stripe test)
2. Exécution des migrations
3. Démarrage Stripe CLI pour webhooks
4. Création d'un premier plan de test
5. Test de souscription avec carte test
6. Vérification des webhooks

### 4. Agent Context Update

Exécuter `.specify/scripts/bash/update-agent-context.sh claude` pour ajouter :
- Package `stripe` (SDK Node.js)
- Nouvelles tables PostgreSQL
- Nouveaux composants Vue et routes API
- Patterns de gestion des webhooks

## Next Steps

Après exécution de `/speckit.plan` :

1. ✅ Phase 0 Complete : `research.md` créé avec décisions techniques
2. ✅ Phase 1 Complete : `data-model.md`, `contracts/`, `quickstart.md` créés
3. ✅ Agent context updated
4. ⏭️ **Next Command** : `/speckit.tasks` pour générer la liste des tâches d'implémentation

## Notes

- Constitution check validé sans violations
- Architecture s'intègre naturellement dans Nuxt.js 4 existant
- Better Auth réutilisé pour authentification
- Nuxt UI réutilisé pour composants
- PostgreSQL (Supabase) étendu avec nouvelles tables
- Tests suivent la stratégie existante (Vitest + Playwright)
