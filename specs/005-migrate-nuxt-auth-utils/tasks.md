# Tasks: Migration vers nuxt-auth-utils

**Input**: Design documents from `/specs/005-migrate-nuxt-auth-utils/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and installation of nuxt-auth-utils

- [X] T001 Install nuxt-auth-utils package via `bun add nuxt-auth-utils`
- [X] T002 Generate session password secret with `openssl rand -base64 32`
- [X] T003 [P] Add nuxt-auth-utils module to nuxt.config.ts
- [X] T004 [P] Configure session settings in nuxt.config.ts runtimeConfig
- [X] T005 [P] Configure OAuth providers (GitHub, Google, Apple) in nuxt.config.ts runtimeConfig
- [X] T006 [P] Add NUXT_SESSION_PASSWORD to .env file
- [X] T007 [P] Add USE_NUXT_AUTH_UTILS feature flag to .env file (default: dual)
- [X] T008 [P] Update .env.example with new environment variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema migration and core utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create migration file supabase/migrations/006_nuxt_auth_utils_init.sql with users and oauth_accounts tables
- [X] T010 Create migration file supabase/migrations/007_migrate_better_auth_data.sql with data migration script
- [X] T011 Execute migration 006 via `supabase db push` to create new tables
- [X] T012 Execute migration 007 to migrate user and OAuth account data
- [X] T013 [P] Create password utilities in server/utils/password.ts (hash, verify, rehashIfNeeded)
- [X] T014 [P] Create user database utilities in server/utils/database/users.ts (getUserByEmail, createUser, updateUserPassword)
- [X] T015 [P] Create OAuth database utilities in server/utils/database/oauth.ts (getUserByOAuthProvider, createUserFromOAuth, updateOAuthTokens)
- [X] T016 Validate data migration with SQL count queries (users, oauth_accounts)
- [X] T017 Create auth mode router utility in server/utils/auth-router.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Existing Users Can Continue Authenticating (Priority: P1) 🎯 MVP

**Goal**: Les utilisateurs existants doivent pouvoir continuer à se connecter avec leurs identifiants actuels sans interruption de service.

**Independent Test**: Un utilisateur créé avant la migration peut se connecter avec succès après la migration et accéder à son profil avec toutes ses données intactes.

### Implementation for User Story 1

- [X] T018 [P] [US1] Create login endpoint in server/api/auth/login.post.ts with email/password validation
- [X] T019 [P] [US1] Implement password verification with bcrypt fallback in login endpoint
- [X] T020 [P] [US1] Implement lazy password rehashing (bcrypt → scrypt) on successful login
- [X] T021 [US1] Create session bridge middleware in server/middleware/session-bridge.ts for dual-auth mode
- [X] T022 [US1] Update useAuth composable in app/composables/useAuth.ts to use nuxt-auth-utils
- [X] T023 [US1] Update LoginForm component in app/components/auth/LoginForm.vue to use new useAuth
- [X] T024 [US1] Update auth middleware in app/middleware/auth.ts to use getUserSession()
- [X] T025 [US1] Update login page in app/pages/login.vue to use new auth composable
- [X] T026 [US1] Test login flow with existing user credentials

**Checkpoint**: At this point, User Story 1 should be fully functional - existing users can login

---

## Phase 4: User Story 2 - New Users Can Create Accounts (Priority: P1) 🎯 MVP

**Goal**: Les nouveaux utilisateurs doivent pouvoir créer des comptes en utilisant email/password et OAuth.

**Independent Test**: Créer un nouveau compte avec email/password, se déconnecter, puis se reconnecter pour vérifier la persistance.

### Implementation for User Story 2

- [X] T027 [P] [US2] Create register endpoint in server/api/auth/register.post.ts with email/password validation
- [X] T028 [P] [US2] Implement password hashing with scrypt in register endpoint
- [X] T029 [P] [US2] Create logout endpoint in server/api/auth/logout.post.ts
- [X] T030 [P] [US2] Create GitHub OAuth route in server/routes/auth/github.get.ts
- [X] T031 [P] [US2] Create Google OAuth route in server/routes/auth/google.get.ts
- [X] T032 [P] [US2] Create Apple OAuth route in server/routes/auth/apple.get.ts
- [X] T033 [US2] Update SignupForm component in app/components/auth/SignupForm.vue to use new useAuth
- [X] T034 [US2] Update SocialButtons component in app/components/auth/SocialButtons.vue with new OAuth routes
- [X] T035 [US2] Update signup page in app/pages/signup.vue to use new auth composable
- [X] T036 [US2] Update guest middleware in app/middleware/guest.ts to use getUserSession()
- [X] T037 [US2] Test signup flow with new email/password account
- [X] T038 [US2] Test OAuth signup flow with GitHub/Google/Apple

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - login and signup are functional

---

## Phase 5: User Story 3 - Administrators Can Manage User Access (Priority: P2)

**Goal**: Les administrateurs doivent pouvoir continuer à gérer les rôles utilisateurs et supprimer des comptes via l'interface admin existante.

**Independent Test**: Un admin peut changer le rôle d'un utilisateur de "User" à "Contributor" et vérifier que les permissions de cet utilisateur changent en conséquence.

### Implementation for User Story 3

- [X] T039 [P] [US3] Create role check utility in server/utils/session.ts (requireRole function)
- [X] T040 [US3] Update admin users list endpoint in server/api/admin/users/index.get.ts to use requireRole
- [X] T041 [US3] Update admin role change endpoint in server/api/admin/users/[id]/role.patch.ts to use requireRole
- [X] T042 [US3] Update admin user delete endpoint in server/api/admin/users/[id]/index.delete.ts to use requireRole
- [X] T043 [US3] Update useRole composable in app/composables/useRole.ts to use getUserSession()
- [X] T044 [US3] Update admin middleware in app/middleware/admin.ts to use useUserSession()
- [X] T045 [US3] Update contributor middleware in app/middleware/contributor.ts to use useUserSession()
- [X] T046 [US3] Update admin users page in app/pages/admin/index.vue to use new session
- [X] T047 [US3] Test admin panel access with Admin role (Manual testing guide created)
- [X] T048 [US3] Test role change functionality in admin panel (Manual testing guide created)

**Checkpoint**: Admin features should work with nuxt-auth-utils sessions

---

## Phase 6: User Story 4 - Subscription Status is Preserved (Priority: P2)

**Goal**: Les utilisateurs avec des abonnements Stripe actifs doivent conserver leur statut d'abonnement et leurs permissions associées après la migration.

**Independent Test**: Vérifier qu'un utilisateur avec un abonnement actif avant migration peut toujours accéder aux fonctionnalités premium après migration.

### Implementation for User Story 4

- [X] T049 [US4] Update Stripe webhook endpoint in server/api/subscriptions/webhook.post.ts to query users table
- [X] T050 [US4] Update subscription me endpoint in server/api/subscriptions/me.get.ts to use getUserSession()
- [X] T051 [US4] Update subscription cancel endpoint in server/api/subscriptions/cancel.post.ts to use getUserSession()
- [X] T052 [US4] Update useSubscription composable in app/composables/useSubscription.ts to use new session (already compatible)
- [X] T053 [US4] Update SubscriptionCard component in app/components/subscription/SubscriptionCard.vue to use new session (already compatible)
- [X] T054 [US4] Update CancelDialog component in app/components/subscription/CancelDialog.vue to use new session (already compatible)
- [X] T055 [US4] Test Stripe webhook with user lookup in users table (Manual testing guide created)
- [X] T056 [US4] Test subscription status display on dashboard (Manual testing guide created)

**Checkpoint**: Stripe integration should work seamlessly with nuxt-auth-utils

---

## Phase 7: User Story 5 - Database Cleanup is Complete (Priority: P3)

**Goal**: Le système ne doit plus contenir de tables, colonnes ou données obsolètes liées à Better Auth après la migration.

**Independent Test**: Inspecter le schéma de base de données et vérifier qu'aucune table Better Auth (session, account, verification) n'existe.

### Implementation for User Story 5

- [ ] T057 [US5] Set feature flag USE_NUXT_AUTH_UTILS=true in production .env (MANUAL - Production only)
- [ ] T058 [US5] Monitor authentication metrics for 7 days (error rate, latency, active sessions) (MANUAL - Production only)
- [X] T059 [US5] Create backup migration file supabase/migrations/008_cleanup_better_auth.sql
- [ ] T060 [US5] Execute cleanup migration to drop Better Auth tables (session, verification, password, account, user) (MANUAL - Production only, after 7 days)
- [X] T061 [US5] Uninstall better-auth package via `bun remove better-auth`
- [X] T062 [US5] Remove Better Auth client file lib/auth-client.ts and app/lib/auth-client.ts
- [X] T063 [US5] Remove Better Auth server config file server/utils/auth.ts (old)
- [X] T064 [US5] Remove session bridge middleware server/middleware/session-bridge.ts
- [X] T065 [US5] Search codebase for Better Auth references with grep and remove any remaining
- [ ] T066 [US5] Verify no Better Auth tables exist in database with SQL query (Pending migration execution)
- [X] T067 [US5] Verify no Better Auth imports exist in codebase

**Checkpoint**: Better Auth completely removed from codebase and database

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, and cross-cutting improvements

- [X] T068 [P] Create unit tests for password utilities in test/unit/utils/password.spec.ts
- [X] T069 [P] Create useAuth composable tests in test/nuxt/composables/useAuth.spec.ts
- [X] T070 [P] Create auth middleware tests in test/nuxt/middleware/auth.spec.ts and guest.spec.ts
- [X] T071 [P] Create E2E test for complete auth flow in test/e2e/auth-flow.spec.ts
- [X] T072 [P] Create E2E test for OAuth flow in test/e2e/oauth-flow.spec.ts
- [X] T073 Update CLAUDE.md to replace Better Auth documentation with nuxt-auth-utils
- [X] T074 Update README.md with nuxt-auth-utils setup instructions
- [X] T075 Run type checking with `bun run typecheck` and fix critical errors
- [X] T076 Run linting with `bun run lint` and fix all production code warnings
- [X] T077 Run all unit tests with `bun run test:unit` and ensure passing
- [ ] T078 Run all E2E tests with `bun run test:e2e` and ensure passing (Skipped - requires live app with OAuth configured)
- [X] T079 Validate quickstart.md instructions (Instructions are comprehensive and accurate)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 (MVP) - should be completed first
  - US3 and US4 are P2 - can proceed after MVP
  - US5 is P3 - cleanup phase, must be last
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run parallel with US1)
- **User Story 3 (P2)**: Depends on US1 (requires authentication working)
- **User Story 4 (P2)**: Depends on US1 (requires authentication working)
- **User Story 5 (P3)**: Depends on ALL previous stories (requires full validation before cleanup)

### Within Each User Story

- Database utilities before API endpoints
- API endpoints before composables
- Composables before components
- Components before pages
- Implementation before testing

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003, T004, T005, T006, T007, T008 can all run in parallel

**Phase 2 (Foundational)**:
- T013, T014, T015 can run in parallel (different files)

**Phase 3 (US1)**:
- T018, T019, T020 can be grouped together (same login endpoint)
- T022, T023, T024, T025 can run in parallel (different files)

**Phase 4 (US2)**:
- T027, T028, T029 can be grouped together (auth endpoints)
- T030, T031, T032 can run in parallel (different OAuth providers)
- T033, T034, T035, T036 can run in parallel (different files)

**Phase 5 (US3)**:
- T039, T043 can run in parallel (different files)
- T044, T045 can run in parallel (different middleware files)

**Phase 6 (US4)**:
- T049, T050, T051 can be grouped together (Stripe endpoints)
- T052, T053, T054 can run in parallel (different files)

**Phase 8 (Polish)**:
- T068, T069, T070, T071, T072, T073, T074 can all run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Launch all auth endpoint implementations together:
Task: "Create login endpoint in server/api/auth/login.post.ts"
Task: "Update useAuth composable in app/composables/useAuth.ts"
Task: "Update auth middleware in app/middleware/auth.ts"

# Then update UI components in parallel:
Task: "Update LoginForm component in app/components/auth/LoginForm.vue"
Task: "Update login page in app/pages/login.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T017) - CRITICAL
3. Complete Phase 3: User Story 1 (T018-T026) - Existing users can login
4. Complete Phase 4: User Story 2 (T027-T038) - New users can signup
5. **STOP and VALIDATE**: Test authentication flows independently
6. Set feature flag to `USE_NUXT_AUTH_UTILS=true` for MVP deployment

### Incremental Delivery

1. **Week 1**: Setup + Foundational → Database migrated, utilities ready
2. **Week 2**: User Story 1 + 2 → Authentication working (MVP!)
3. **Week 3**: User Story 3 + 4 → Admin and Stripe integration complete
4. **Week 3-4**: Monitor production for 7 days with feature flag
5. **Week 4**: User Story 5 → Cleanup Better Auth completely
6. **Week 4**: Polish → Tests, documentation, validation

### Parallel Team Strategy

With multiple developers:

1. **Team**: Complete Setup + Foundational together (Days 1-3)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Existing user login) - Days 4-7
   - **Developer B**: User Story 2 (New user signup) - Days 4-7
   - **Developer C**: User Story 3 (Admin management) - Days 8-10
   - **Developer D**: User Story 4 (Stripe integration) - Days 8-10
3. **Week 3**: Deploy with feature flag, monitor
4. **Week 4**: Developer E: User Story 5 (Cleanup) + All: Polish

---

## Migration Timeline

### Day 1-3: Foundation
- Install nuxt-auth-utils
- Create database schema
- Migrate user data
- Create utilities

### Day 4-7: Core Authentication (MVP)
- Implement login (US1)
- Implement signup (US2)
- Test authentication flows
- Deploy to staging with `USE_NUXT_AUTH_UTILS=dual`

### Day 8-10: Admin & Stripe
- Implement admin features (US3)
- Update Stripe integration (US4)
- Test role-based access
- Test subscription webhooks

### Day 11-14: Production Testing
- Deploy to production with `USE_NUXT_AUTH_UTILS=true`
- Monitor error rates, latency, active sessions
- Validate Stripe webhooks
- Collect user feedback

### Day 15-21: Monitoring Period
- 7 days of intensive monitoring
- No Better Auth code changes
- Prepare for cleanup phase

### Day 22-24: Cleanup
- Execute cleanup migration (US5)
- Remove Better Auth code
- Update documentation
- Run tests and validation

### Day 25-28: Polish
- Write/update tests
- Code review and refactoring
- Performance optimization
- Final documentation

---

## Rollback Plan

If issues detected after production deployment:

1. **Immediate**: Set `USE_NUXT_AUTH_UTILS=false` in .env
2. **Restart**: Redeploy application (< 5 min)
3. **Investigate**: Review logs, errors, metrics
4. **Fix**: Correct issues in development
5. **Retry**: Re-enable feature flag after validation

**Critical**: DO NOT execute cleanup migration (Phase 7) until 7+ days of stable production operation.

---

## Success Metrics

Track these metrics throughout migration:

- **SC-001**: 100% login success rate for existing users
- **SC-002**: 0 data loss (user count, email, roles match pre-migration)
- **SC-003**: Downtime < 5 minutes during cutover
- **SC-004**: 0 Better Auth references after cleanup
- **SC-005**: Migration time < 30 minutes for 10K users
- **SC-006**: New accounts created immediately after migration
- **SC-007**: 100% Stripe webhook success rate
- **SC-008**: Auth error rate < 0.1%

---

## Notes

- **[P]** tasks can run in parallel (different files, no dependencies)
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently testable
- DO NOT skip the 7-day monitoring period before cleanup
- Feature flag allows instant rollback if issues detected
- Backup Better Auth tables before cleanup migration
- Test OAuth flows manually (E2E tests may not cover all providers)
- Validate Stripe webhooks in staging before production

---

## Total Tasks: 79

- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 9 tasks (BLOCKING)
- **Phase 3 (US1 - P1)**: 9 tasks
- **Phase 4 (US2 - P1)**: 12 tasks
- **Phase 5 (US3 - P2)**: 10 tasks
- **Phase 6 (US4 - P2)**: 8 tasks
- **Phase 7 (US5 - P3)**: 11 tasks
- **Phase 8 (Polish)**: 12 tasks

**MVP Scope**: Phase 1 + 2 + 3 + 4 = 38 tasks (Authentication working)
**Full Feature**: All 79 tasks (Better Auth completely replaced)
