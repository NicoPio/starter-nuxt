# Tasks: Stripe Subscription Management with Simplified Admin Configuration

**Input**: Design documents from `/specs/004-stripe-subscription-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a **Web application (Nuxt.js full-stack)** project:
- **Frontend**: `app/` (components, pages, composables)
- **Backend**: `server/` (API routes, utils, middleware)
- **Database**: `supabase/migrations/`
- **Types**: `app/types/`
- **Tests**: `test/unit/`, `test/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [ ] T001 Install Stripe Node.js SDK dependency: `bun add stripe`
- [ ] T002 [P] Configure Stripe runtime config in `nuxt.config.ts`
- [ ] T003 [P] Generate encryption key and add to `.env.example` with documentation
- [ ] T004 [P] Create Stripe types file: `app/types/stripe.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create database migration file: `supabase/migrations/YYYYMMDDHHMMSS_stripe_subscriptions.sql`
- [ ] T006 Copy complete SQL schema from `data-model.md` to migration file
- [ ] T007 Run database migration: `supabase db push`
- [ ] T008 Verify all 5 tables created (stripe_configuration, subscription_plans, user_subscriptions, payment_history, webhook_logs)
- [ ] T009 [P] Add `stripe_customer_id` column to `user` table in migration
- [ ] T010 [P] Create Stripe client singleton util: `server/utils/stripe/client.ts`
- [ ] T011 [P] Create crypto util for API key encryption: `server/utils/stripe/crypto.ts`
- [ ] T012 [P] Create Stripe config loader util: `server/utils/stripe/config.ts`
- [ ] T013 [P] Create database query util: `server/utils/database/stripe.ts`
- [ ] T014 [P] Create Stripe validation schemas: `server/utils/validation/stripe.ts` (using Zod)
- [ ] T015 [P] Create i18n translation files: `content/i18n/en/stripe.yml` and `content/i18n/fr/stripe.yml`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configuration initiale de Stripe (Priority: P1) 🎯 MVP

**Goal**: Permettre aux administrateurs de configurer les clés API Stripe et valider la connexion

**Independent Test**:
1. Se connecter en tant qu'admin
2. Accéder à `/admin/stripe`
3. Saisir des clés API Stripe test (sk_test_..., pk_test_...)
4. Vérifier que la connexion est validée avec succès
5. Vérifier que les clés sont masquées partiellement lors de l'affichage

### Backend Implementation for User Story 1

- [ ] T016 [P] [US1] Create GET config endpoint: `server/api/admin/stripe/config.get.ts`
- [ ] T017 [P] [US1] Create POST config endpoint: `server/api/admin/stripe/config.post.ts`
- [ ] T018 [P] [US1] Create POST test-connection endpoint: `server/api/admin/stripe/test-connection.post.ts`
- [ ] T019 [US1] Implement config save logic with encryption in `server/utils/stripe/config.ts`
- [ ] T020 [US1] Implement connection validation with Stripe API in `server/utils/stripe/client.ts`

### Frontend Implementation for User Story 1

- [ ] T021 [P] [US1] Create Stripe config composable: `app/composables/useStripeConfig.ts`
- [ ] T022 [P] [US1] Create ConfigurationForm component: `app/components/admin/stripe/ConfigurationForm.vue`
- [ ] T023 [P] [US1] Create ConnectionStatus component: `app/components/admin/stripe/ConnectionStatus.vue`
- [ ] T024 [US1] Create admin Stripe config page: `app/pages/admin/stripe/index.vue`
- [ ] T025 [US1] Add Stripe config navigation to admin menu
- [ ] T026 [US1] Implement key masking util in `app/utils/stripe.ts` (mask API keys)

**Checkpoint**: At this point, admins can configure Stripe keys and see connection status

---

## Phase 4: User Story 6 - Gestion des webhooks Stripe (Priority: P1)

**Goal**: Synchroniser automatiquement les statuts d'abonnement via webhooks Stripe

**Why before US2**: Les webhooks sont critiques pour la cohérence des données. Ils doivent être prêts avant toute création d'abonnement.

**Independent Test**:
1. Démarrer Stripe CLI: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
2. Trigger un événement test: `stripe trigger customer.subscription.created`
3. Vérifier que l'événement est reçu et traité (check `webhook_logs` table)
4. Vérifier qu'aucun doublon n'est créé (idempotence)

### Backend Implementation for User Story 6

- [ ] T027 [P] [US6] Create webhook handler: `server/api/webhooks/stripe.post.ts`
- [ ] T028 [P] [US6] Implement signature verification in webhook handler
- [ ] T029 [P] [US6] Implement idempotence check (query `webhook_logs` by `stripe_event_id`)
- [ ] T030 [P] [US6] Create subscription event handlers: `server/utils/stripe/webhooks/subscriptions.ts`
- [ ] T031 [P] [US6] Create invoice event handlers: `server/utils/stripe/webhooks/invoices.ts`
- [ ] T032 [P] [US6] Create payment event handlers: `server/utils/stripe/webhooks/payments.ts`
- [ ] T033 [US6] Implement `handleSubscriptionCreated` handler
- [ ] T034 [US6] Implement `handleSubscriptionUpdated` handler
- [ ] T035 [US6] Implement `handleSubscriptionDeleted` handler
- [ ] T036 [US6] Implement `handlePaymentSucceeded` handler
- [ ] T037 [US6] Implement `handlePaymentFailed` handler
- [ ] T038 [US6] Implement webhook logging to `webhook_logs` table
- [ ] T039 [US6] Add error handling and Stripe retry logic (return 500 on failure)

**Checkpoint**: Webhooks are functional and can process Stripe events with idempotence

---

## Phase 5: User Story 2 - Création d'offres d'abonnement (Priority: P2)

**Goal**: Permettre aux administrateurs de créer et gérer des plans d'abonnement synchronisés avec Stripe

**Depends on**: US1 (Stripe configured), US6 (webhooks ready for sync)

**Independent Test**:
1. Se connecter en tant qu'admin
2. Accéder à `/admin/subscriptions`
3. Créer un nouveau plan: nom="Pro", prix=29.00 EUR, interval=month
4. Vérifier que le plan est créé dans Stripe (Product + Price)
5. Vérifier qu'il apparaît dans la liste des plans
6. Tester sync depuis Stripe: importer un plan existant

### Backend Implementation for User Story 2

- [ ] T040 [P] [US2] Create Stripe products util: `server/utils/stripe/products.ts`
- [ ] T041 [P] [US2] Create Stripe prices util: `server/utils/stripe/prices.ts`
- [ ] T042 [P] [US2] Create GET plans endpoint: `server/api/admin/subscription-plans/index.get.ts`
- [ ] T043 [P] [US2] Create POST plans endpoint: `server/api/admin/subscription-plans/index.post.ts`
- [ ] T044 [P] [US2] Create GET plan by ID endpoint: `server/api/admin/subscription-plans/[id].get.ts`
- [ ] T045 [P] [US2] Create PUT plan update endpoint: `server/api/admin/subscription-plans/[id].put.ts`
- [ ] T046 [P] [US2] Create DELETE plan endpoint: `server/api/admin/subscription-plans/[id].delete.ts`
- [ ] T047 [P] [US2] Create POST sync endpoint: `server/api/admin/subscription-plans/sync.post.ts`
- [ ] T048 [US2] Implement createPlan logic (create Product + Price in Stripe, save to DB)
- [ ] T049 [US2] Implement updatePlan logic (update Stripe Product, sync to DB)
- [ ] T050 [US2] Implement deletePlan logic (check active subscriptions, prevent if any)
- [ ] T051 [US2] Implement syncFromStripe logic (fetch all Products/Prices, upsert to DB)
- [ ] T052 [US2] Add plan validation (prevent delete if active subscriptions exist)

### Frontend Implementation for User Story 2

- [ ] T053 [P] [US2] Create subscription plans composable: `app/composables/useSubscriptionPlans.ts`
- [ ] T054 [P] [US2] Create PlanList component: `app/components/admin/subscriptions/PlanList.vue`
- [ ] T055 [P] [US2] Create PlanCard component: `app/components/admin/subscriptions/PlanCard.vue`
- [ ] T056 [P] [US2] Create PlanForm component: `app/components/admin/subscriptions/PlanForm.vue`
- [ ] T057 [P] [US2] Create PlanMetrics component: `app/components/admin/subscriptions/PlanMetrics.vue`
- [ ] T058 [P] [US2] Create PlanSyncButton component: `app/components/admin/subscriptions/PlanSyncButton.vue`
- [ ] T059 [US2] Create plans index page: `app/pages/admin/subscriptions/index.vue`
- [ ] T060 [US2] Create new plan page: `app/pages/admin/subscriptions/new.vue`
- [ ] T061 [US2] Create edit plan page: `app/pages/admin/subscriptions/[id]/edit.vue`
- [ ] T062 [US2] Add subscription management navigation to admin menu

**Checkpoint**: Admins can create, edit, delete, and sync subscription plans with Stripe

---

## Phase 6: User Story 3 - Souscription utilisateur à un abonnement (Priority: P1)

**Goal**: Permettre aux utilisateurs de s'abonner via Stripe Checkout et activer leur abonnement

**Depends on**: US2 (plans exist), US6 (webhooks ready to activate subscription)

**Independent Test**:
1. Se connecter en tant qu'utilisateur
2. Accéder à `/subscriptions`
3. Sélectionner un plan "Pro"
4. Cliquer sur "S'abonner" → redirection vers Stripe Checkout
5. Utiliser carte test: 4242 4242 4242 4242
6. Compléter le paiement → redirection vers `/subscriptions/success`
7. Vérifier que l'abonnement est actif dans le profil
8. Vérifier les tables: `user_subscriptions`, `payment_history`

### Backend Implementation for User Story 3

- [ ] T063 [P] [US3] Create Stripe customers util: `server/utils/stripe/customers.ts`
- [ ] T064 [P] [US3] Create Stripe checkout util: `server/utils/stripe/checkout.ts`
- [ ] T065 [P] [US3] Create GET public plans endpoint: `server/api/subscriptions/plans.get.ts`
- [ ] T066 [P] [US3] Create POST checkout endpoint: `server/api/subscriptions/checkout.post.ts`
- [ ] T067 [P] [US3] Create GET current subscription endpoint: `server/api/subscriptions/current.get.ts`
- [ ] T068 [US3] Implement ensureCustomerExists logic (create Stripe Customer if needed)
- [ ] T069 [US3] Implement createCheckoutSession logic (create Stripe Checkout Session)
- [ ] T070 [US3] Add validation: prevent multiple active subscriptions per user
- [ ] T071 [US3] Update webhook handlers to activate subscription on `invoice.payment_succeeded`

### Frontend Implementation for User Story 3

- [ ] T072 [P] [US3] Create user subscription composable: `app/composables/useUserSubscription.ts`
- [ ] T073 [P] [US3] Create PlanSelector component: `app/components/user/subscriptions/PlanSelector.vue`
- [ ] T074 [P] [US3] Create SubscriptionCard component: `app/components/user/subscriptions/SubscriptionCard.vue`
- [ ] T075 [US3] Create subscriptions page: `app/pages/subscriptions/index.vue`
- [ ] T076 [US3] Create success page: `app/pages/subscriptions/success.vue`
- [ ] T077 [US3] Create cancel page: `app/pages/subscriptions/cancel.vue`
- [ ] T078 [US3] Add subscription status check to user dashboard
- [ ] T079 [US3] Add middleware to verify subscription status: `app/middleware/subscription-required.ts` (if needed)

**Checkpoint**: Users can browse plans, subscribe via Stripe Checkout, and see their active subscription

---

## Phase 7: User Story 4 - Gestion d'abonnement utilisateur (Priority: P2)

**Goal**: Permettre aux utilisateurs de gérer leur abonnement (historique, factures, annulation)

**Depends on**: US3 (users have subscriptions)

**Independent Test**:
1. Se connecter en tant qu'utilisateur avec abonnement actif
2. Accéder à `/dashboard/subscription`
3. Voir les détails de l'abonnement (plan, date renouvellement, montant)
4. Consulter l'historique des paiements
5. Télécharger une facture PDF
6. Annuler l'abonnement → confirmer
7. Vérifier que `cancel_at_period_end = true` dans DB
8. Vérifier que l'accès reste actif jusqu'à la fin de période

### Backend Implementation for User Story 4

- [ ] T080 [P] [US4] Create Stripe subscriptions util: `server/utils/stripe/subscriptions.ts`
- [ ] T081 [P] [US4] Create POST cancel subscription endpoint: `server/api/subscriptions/cancel.post.ts`
- [ ] T082 [P] [US4] Create POST reactivate subscription endpoint: `server/api/subscriptions/reactivate.post.ts`
- [ ] T083 [P] [US4] Create POST portal session endpoint: `server/api/subscriptions/portal.post.ts`
- [ ] T084 [P] [US4] Create GET payment history endpoint: `server/api/payments/history.get.ts`
- [ ] T085 [P] [US4] Create GET invoice PDF endpoint: `server/api/payments/invoice/[id].get.ts`
- [ ] T086 [US4] Implement cancelSubscription logic (Stripe API + update DB)
- [ ] T087 [US4] Implement reactivateSubscription logic (Stripe API + update DB)
- [ ] T088 [US4] Implement getPaymentHistory logic (query `payment_history` table)
- [ ] T089 [US4] Implement getInvoicePdf logic (fetch from Stripe)
- [ ] T090 [US4] Update webhook handlers: handle `customer.subscription.deleted` for period end

### Frontend Implementation for User Story 4

- [ ] T091 [P] [US4] Create payment history composable: `app/composables/usePaymentHistory.ts`
- [ ] T092 [P] [US4] Create PaymentHistory component: `app/components/user/subscriptions/PaymentHistory.vue`
- [ ] T093 [P] [US4] Create InvoiceDownload component: `app/components/user/subscriptions/InvoiceDownload.vue`
- [ ] T094 [P] [US4] Create CancelDialog component: `app/components/user/subscriptions/CancelDialog.vue`
- [ ] T095 [US4] Create subscription management page: `app/pages/dashboard/subscription.vue`
- [ ] T096 [US4] Add subscription summary to main dashboard
- [ ] T097 [US4] Implement cancel confirmation flow with consequences explanation

**Checkpoint**: Users can view their subscription details, payment history, download invoices, and cancel subscription

---

## Phase 8: User Story 5 - Configuration simplifiée guidée (Priority: P3)

**Goal**: Fournir un assistant de configuration guidé pour les administrateurs non techniques

**Depends on**: US1 (config Stripe), US2 (create plans)

**Independent Test**:
1. Se connecter en tant qu'admin sur une installation neuve (Stripe non configuré)
2. Être redirigé automatiquement vers `/admin/stripe/wizard`
3. Suivre l'assistant étape par étape:
   - Étape 1: Introduction à Stripe
   - Étape 2: Lien pour créer compte Stripe
   - Étape 3: Saisie des clés API avec validation
   - Étape 4: Création du premier plan d'abonnement
4. Voir le récapitulatif final avec prochaines étapes

### Backend Implementation for User Story 5

- [ ] T098 [US5] Add wizard detection logic to admin dashboard (redirect if Stripe not configured)
- [ ] T099 [US5] Create wizard state management util: `server/utils/stripe/wizard.ts`

### Frontend Implementation for User Story 5

- [ ] T100 [P] [US5] Create ConfigurationWizard component: `app/components/admin/stripe/ConfigurationWizard.vue`
- [ ] T101 [P] [US5] Create WizardStep1 component (Introduction): `app/components/admin/stripe/wizard/Step1Introduction.vue`
- [ ] T102 [P] [US5] Create WizardStep2 component (Account creation): `app/components/admin/stripe/wizard/Step2Account.vue`
- [ ] T103 [P] [US5] Create WizardStep3 component (API keys): `app/components/admin/stripe/wizard/Step3ApiKeys.vue`
- [ ] T104 [P] [US5] Create WizardStep4 component (First plan): `app/components/admin/stripe/wizard/Step4FirstPlan.vue`
- [ ] T105 [P] [US5] Create WizardSummary component: `app/components/admin/stripe/wizard/Summary.vue`
- [ ] T106 [P] [US5] Create MigrationChecklist component: `app/components/admin/stripe/MigrationChecklist.vue`
- [ ] T107 [US5] Create wizard page: `app/pages/admin/stripe/wizard.vue`
- [ ] T108 [US5] Implement wizard navigation (stepper with validation per step)
- [ ] T109 [US5] Add wizard re-entry point in admin stripe config page

**Checkpoint**: New admins can configure Stripe and create their first plan without technical knowledge

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

### Security & Error Handling

- [ ] T110 [P] Add comprehensive error handling to all API routes (try-catch, structured errors)
- [ ] T111 [P] Implement rate limiting on sensitive endpoints (config, checkout)
- [ ] T112 [P] Add CORS configuration for webhook endpoint (Stripe IPs)
- [ ] T113 [P] Implement request logging for all Stripe API calls
- [ ] T114 [P] Add audit logging for admin actions (config changes, plan modifications)

### Performance & Optimization

- [ ] T115 [P] Add caching for subscription plans query (1 hour TTL)
- [ ] T116 [P] Implement retry logic with exponential backoff for Stripe API calls
- [ ] T117 [P] Add database indexes optimization (verify performance on large datasets)
- [ ] T118 [P] Implement lazy loading for payment history (pagination)

### Monitoring & Observability

- [ ] T119 [P] Add Stripe webhook processing metrics (success/failure rate)
- [ ] T120 [P] Implement alerting for failed webhooks (> 5% failure rate)
- [ ] T121 [P] Add dashboard metrics: active subscriptions, MRR, churn rate
- [ ] T122 [P] Implement health check endpoint for Stripe connectivity

### Documentation & Testing Setup

- [ ] T123 [P] Create developer documentation for webhook testing with Stripe CLI
- [ ] T124 [P] Create admin documentation for Stripe configuration
- [ ] T125 [P] Add example environment variables to `.env.example` with descriptions
- [ ] T126 [P] Validate quickstart.md with real Stripe test keys
- [ ] T127 [P] Create troubleshooting guide for common Stripe errors

### UI/UX Polish

- [ ] T128 [P] Add loading states to all Stripe operations (checkout, cancel, etc.)
- [ ] T129 [P] Implement optimistic UI updates for subscription actions
- [ ] T130 [P] Add empty states for plans list, payment history
- [ ] T131 [P] Implement toast notifications for all user actions
- [ ] T132 [P] Add dark mode support verification for all Stripe components
- [ ] T133 [P] Implement responsive design for all Stripe pages (mobile, tablet)

### Accessibility

- [ ] T134 [P] Add ARIA labels to all Stripe forms and buttons
- [ ] T135 [P] Implement keyboard navigation for wizard steps
- [ ] T136 [P] Add screen reader announcements for subscription status changes
- [ ] T137 [P] Verify WCAG 2.1 AA compliance for all Stripe UI components

### i18n Completion

- [ ] T138 [P] Complete French translations in `content/i18n/fr/stripe.yml`
- [ ] T139 [P] Complete English translations in `content/i18n/en/stripe.yml`
- [ ] T140 [P] Add translation keys for all error messages
- [ ] T141 [P] Add translation keys for all success messages

### Production Readiness

- [ ] T142 Verify all clés API are properly encrypted in database
- [ ] T143 Verify webhook signature validation is enforced
- [ ] T144 Test complete subscription flow end-to-end with real Stripe test keys
- [ ] T145 Verify idempotence: trigger same webhook twice, check no duplicate data
- [ ] T146 Test checkout flow with all Stripe test cards (success, declined, 3DS, etc.)
- [ ] T147 Test cancellation flow: verify access maintained until period end
- [ ] T148 Verify GDPR compliance: test user deletion → Stripe subscription cancelled
- [ ] T149 Create production deployment checklist (live keys, webhook URLs, etc.)
- [ ] T150 Run quickstart.md validation from start to finish

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Configuration Stripe (P1)
- **User Story 6 (Phase 4)**: Depends on US1 - Webhooks (P1, but needed before subscriptions)
- **User Story 2 (Phase 5)**: Depends on US1 + US6 - Create subscription plans (P2)
- **User Story 3 (Phase 6)**: Depends on US2 + US6 - User subscription (P1)
- **User Story 4 (Phase 7)**: Depends on US3 - Manage subscription (P2)
- **User Story 5 (Phase 8)**: Depends on US1 + US2 - Wizard (P3)
- **Polish (Phase 9)**: Depends on desired user stories - Cross-cutting improvements

### User Story Dependencies

```
Foundational (Phase 2)
    ↓
US1: Config Stripe (P1) ← START HERE (MVP)
    ↓
US6: Webhooks (P1) ← CRITICAL before subscriptions
    ↓
US2: Create Plans (P2)
    ↓
US3: User Subscription (P1) ← MVP COMPLETE at this point
    ↓
US4: Manage Subscription (P2)
    ↓
US5: Wizard (P3)
```

### Within Each User Story

- Backend API routes can be created in parallel [P]
- Backend utils can be created in parallel [P]
- Frontend components can be created in parallel [P]
- Frontend pages depend on components and composables
- Integration tasks depend on all related components

### Parallel Opportunities

- **Setup (Phase 1)**: All tasks marked [P] can run in parallel (T002, T003, T004)
- **Foundational (Phase 2)**: Tasks T009-T015 marked [P] can run in parallel (utils creation)
- **Within each User Story**: All tasks marked [P] within a story can run in parallel
- **Across User Stories**: Once US6 completes, US2 can start. Once US2 completes, US3 can start (if team capacity allows)

---

## Parallel Example: User Story 1 (Config Stripe)

```bash
# Launch all backend routes for US1 together:
Task T016: "Create GET config endpoint: server/api/admin/stripe/config.get.ts"
Task T017: "Create POST config endpoint: server/api/admin/stripe/config.post.ts"
Task T018: "Create POST test-connection endpoint: server/api/admin/stripe/test-connection.post.ts"

# Launch all frontend components for US1 together:
Task T022: "Create ConfigurationForm component: app/components/admin/stripe/ConfigurationForm.vue"
Task T023: "Create ConnectionStatus component: app/components/admin/stripe/ConnectionStatus.vue"
```

---

## Implementation Strategy

### MVP First (Minimum Viable Product)

**Scope**: US1 + US6 + US2 + US3 = Complete subscription flow

1. Complete **Phase 1: Setup**
2. Complete **Phase 2: Foundational** (CRITICAL - blocks all stories)
3. Complete **Phase 3: US1 - Config Stripe**
4. Complete **Phase 4: US6 - Webhooks**
5. Complete **Phase 5: US2 - Create Plans**
6. Complete **Phase 6: US3 - User Subscription**
7. **STOP and VALIDATE**:
   - Admin can configure Stripe ✅
   - Admin can create plans ✅
   - Users can subscribe ✅
   - Webhooks sync subscription status ✅
8. Deploy/demo if ready

**Why this MVP?**:
- Delivers complete revenue-generating flow
- Users can pay and get subscribed
- Admin can manage the core business
- Foundation for all other features

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Database + Utils ready
2. **MVP** (Phases 3-6) → Revenue-generating flow → **DEPLOY v1.0**
3. **Self-Service** (Phase 7) → Users manage subscriptions → **DEPLOY v1.1**
4. **Ease of Use** (Phase 8) → Wizard for admins → **DEPLOY v1.2**
5. **Polish** (Phase 9) → Production-grade → **DEPLOY v2.0**

Each deployment adds value without breaking previous features.

### Parallel Team Strategy

With **3 developers** after Foundational phase completes:

- **Developer A**: US1 (Config) → US6 (Webhooks) → US2 (Plans)
- **Developer B**: Waits for US2 → US3 (User subscription) → US4 (Management)
- **Developer C**: Waits for US1 + US2 → US5 (Wizard) → Polish

**Sequential execution** (single developer):
1. Setup → Foundational → US1 → US6 → US2 → US3 (MVP!)
2. Continue with US4 → US5 → Polish

---

## Task Count Summary

- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 11 tasks
- **Phase 3 (US1 - Config Stripe)**: 11 tasks
- **Phase 4 (US6 - Webhooks)**: 13 tasks
- **Phase 5 (US2 - Create Plans)**: 23 tasks
- **Phase 6 (US3 - User Subscription)**: 17 tasks
- **Phase 7 (US4 - Manage Subscription)**: 18 tasks
- **Phase 8 (US5 - Wizard)**: 12 tasks
- **Phase 9 (Polish)**: 41 tasks

**Total**: 150 tasks

**Parallel opportunities**: 87 tasks marked [P] (58% can run in parallel within phases)

**MVP scope**: 79 tasks (Setup + Foundational + US1 + US6 + US2 + US3)

---

## Format Validation

✅ All tasks follow the required format:
- Checkbox: `- [ ]`
- Task ID: `T001`, `T002`, etc.
- [P] marker: Present on parallelizable tasks
- [Story] label: Present on all user story tasks (US1, US2, US3, US4, US5, US6)
- File paths: Included in all implementation tasks

---

## Notes

- **[P] tasks** = different files, no dependencies within phase
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **No tests requested**: Focus on implementation, manual testing via quickstart.md
- **Stripe CLI required**: For webhook testing during development
- **Test cards**: Use Stripe test cards (4242 4242 4242 4242) for checkout testing

---

## Production Deployment Checklist (Reference)

Before going live, complete these steps from `quickstart.md`:

- [ ] Replace test keys with live keys (sk_live_, pk_live_)
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Enable Stripe Customer Portal with desired features
- [ ] Set up proper error logging and monitoring
- [ ] Configure dunning (retry logic for failed payments)
- [ ] Set up email notifications for payment events
- [ ] Review and adjust cancellation policies
- [ ] Test subscription flow end-to-end with real card (small amount)
- [ ] Verify tax settings (if applicable)
- [ ] Review Stripe compliance requirements for your region
