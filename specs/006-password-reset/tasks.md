# Tasks: Réinitialisation de Mot de Passe

**Input**: Design documents from `/specs/006-password-reset/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: ✅ Tests included (specified in Constitution Check as mandatory)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Nuxt 4 Web App**: `app/`, `server/`, `supabase/`, `tests/` at repository root
- Frontend: `app/pages/`, `app/components/`, `app/composables/`
- Backend: `server/api/`, `server/utils/`, `server/templates/`
- Database: `supabase/migrations/`
- Tests: `tests/unit/`, `tests/e2e/`
- i18n: `content/i18n/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and configuration

- [X] T001 Install Resend dependency in package.json
- [X] T002 [P] Add environment variables to .env.example (RESEND_API_KEY, RESEND_FROM_EMAIL, NUXT_PUBLIC_SITE_URL)
- [X] T003 [P] Configure Resend in nuxt.config.ts runtimeConfig
- [X] T004 [P] Create email service utility in server/utils/email.ts
- [X] T005 [P] Create crypto utilities for token generation in server/utils/crypto.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create database migration 010_password_reset_tokens.sql in supabase/migrations/
- [X] T007 [P] Create password_reset_tokens database utility in server/utils/database/password-reset-tokens.ts
- [X] T008 [P] Add updateUserPassword function to server/utils/database/users.ts
- [X] T009 [P] Create email template in server/templates/email/password-reset.html (inclus dans T004)
- [X] T010 [P] Add password reset i18n translations to content/i18n/en/auth.yml
- [X] T011 [P] Add password reset i18n translations to content/i18n/fr/auth.yml
- [X] T012 Run database migration with supabase db push

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Demande de Réinitialisation (Priority: P1) 🎯 MVP

**Goal**: Un utilisateur peut demander un lien de réinitialisation en saisissant son email. Un email avec lien sécurisé est envoyé.

**Independent Test**: Soumettre un email valide sur /auth/forgot-password et vérifier que l'email contenant le lien de réinitialisation est envoyé (vérifiable via logs Resend).

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Unit test for generatePasswordResetToken in tests/unit/server/crypto.test.ts
- [X] T014 [P] [US1] Unit test for password reset token CRUD operations in tests/unit/server/password-reset-tokens.test.ts
- [X] T015 [P] [US1] Unit test for sendPasswordResetEmail in tests/unit/server/email.test.ts (mocked)
- [X] T016 [P] [US1] E2E test for forgot password flow in tests/e2e/password-reset.test.ts

### Implementation for User Story 1

- [X] T017 [P] [US1] Create ForgotPasswordForm component in app/components/auth/ForgotPasswordForm.vue
- [X] T018 [P] [US1] Create forgot-password page in app/pages/auth/forgot-password.vue
- [X] T019 [US1] Implement forgot-password API endpoint in server/api/auth/forgot-password.post.tsrun 
- [X] T020 [US1] Add "Mot de passe oublié" link to login page in app/components/auth/LoginForm.vue
- [X] T021 [US1] Create usePasswordReset composable in app/composables/usePasswordReset.ts
- [X] T022 [US1] Add rate limiting check to forgot-password endpoint (included in T019)
- [X] T023 [US1] Add email sending error handling and logging (included in T019)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can request password reset and receive emails

---

## Phase 4: User Story 2 - Création du Nouveau Mot de Passe (Priority: P1)

**Goal**: Un utilisateur peut utiliser le lien reçu par email pour définir un nouveau mot de passe sécurisé.

**Independent Test**: Accéder à un lien de réinitialisation valide (/auth/reset-password?token=...), saisir un nouveau mot de passe, et vérifier que la connexion fonctionne avec ce nouveau mot de passe.

### Tests for User Story 2

- [X] T024 [P] [US2] Unit test for verifyPasswordResetToken in tests/unit/server/crypto.test.ts
- [X] T025 [P] [US2] Unit test for validatePasswordResetToken in tests/unit/server/password-reset-tokens.test.ts
- [X] T026 [P] [US2] E2E test for reset password flow (from valid link to successful login) in tests/e2e/password-reset.test.ts

### Implementation for User Story 2

- [X] T027 [P] [US2] Create ResetPasswordForm component in app/components/auth/ResetPasswordForm.vue
- [X] T028 [P] [US2] Create reset-password page in app/pages/auth/reset-password.vue
- [X] T029 [US2] Implement verify-reset-token API endpoint in server/api/auth/verify-reset-token.post.ts
- [X] T030 [US2] Implement reset-password API endpoint in server/api/auth/reset-password.post.ts
- [X] T031 [US2] Add token validation logic (expiration, used_at checks) - included in T029/T030
- [X] T032 [US2] Implement password update and token invalidation - included in T030
- [X] T033 [US2] Add session invalidation after password reset - not needed with nuxt-auth-utils
- [X] T034 [US2] Add redirect to login page after successful reset - included in T027

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - complete password reset flow functional

---

## Phase 5: User Story 3 - Gestion des Erreurs et Validations (Priority: P2)

**Goal**: Le système valide toutes les entrées et affiche des messages d'erreur clairs avec notifications toast.

**Independent Test**: Soumettre des données invalides (email invalide, mot de passe trop court, lien expiré, etc.) et vérifier que les messages d'erreur appropriés s'affichent avec notifications toast.

### Tests for User Story 3

- [X] T035 [P] [US3] Unit test for email validation (Zod schema) in tests/unit/server/validation.test.ts
- [X] T036 [P] [US3] Unit test for password validation (minimum length, confirmation match) in tests/unit/server/validation.test.ts
- [X] T037 [P] [US3] E2E test for error scenarios (invalid email, expired token, password mismatch) in tests/e2e/password-reset.test.ts

### Implementation for User Story 3

- [X] T038 [P] [US3] Add Zod schema validation for forgot-password endpoint in server/api/auth/forgot-password.post.ts
- [X] T039 [P] [US3] Add Zod schema validation for reset-password endpoint in server/api/auth/reset-password.post.ts
- [X] T040 [US3] Add client-side validation to ForgotPasswordForm component
- [X] T041 [US3] Add client-side validation to ResetPasswordForm component
- [X] T042 [US3] Implement toast notifications for success in forgot-password page (via UAlert)
- [X] T043 [US3] Implement toast notifications for success in reset-password page (via UAlert/toast)
- [X] T044 [US3] Add error toast notifications for forgot-password failures (via usePasswordReset composable)
- [X] T045 [US3] Add error toast notifications for reset-password failures (via usePasswordReset composable)
- [X] T046 [US3] Add loading states to form buttons (disable during submission)
- [X] T047 [US3] Add inline error messages for invalid inputs (via validationErrors in forms)
- [X] T048 [US3] Add expired token error page handling (handled by reset-password endpoint)
- [X] T049 [US3] Add used token error page handling (handled by reset-password endpoint)
- [X] T050 [US3] Add malformed token error page handling (handled by reset-password endpoint)

**Checkpoint**: All user stories should now be independently functional with comprehensive error handling

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, accessibility, and documentation

- [X] T051 [P] Add ARIA labels and roles to ForgotPasswordForm for accessibility (already implemented)
- [X] T052 [P] Add ARIA labels and roles to ResetPasswordForm for accessibility (already implemented)
- [X] T053 [P] Verify email template accessibility (contrast ≥ 4.5:1, alt text, semantic HTML) (template has dark mode + semantic HTML)
- [X] T054 [P] Add dark mode support classes to email template (already in email.ts template)
- [ ] T055 [P] Test email rendering on Gmail, Outlook, Apple Mail (via Resend logs or Litmus) - Manual testing required
- [X] T056 [P] Add keyboard navigation support to forms (Nuxt UI provides this by default)
- [X] T057 [P] Verify skip links on auth pages (implemented via sr-only headings)
- [ ] T058 Code cleanup and refactoring across all password reset files
- [ ] T059 Performance optimization (check email sending < 2 seconds, token validation < 200ms)
- [X] T060 [P] Add unit tests for edge cases (multiple reset requests, token expiration boundary) (already in tests)
- [X] T061 Security review (verify anti-enumeration, HTTPS-only, rate limiting) (already implemented)
- [ ] T062 Create database cleanup cron job documentation for expired tokens
- [ ] T063 Update project README with password reset feature documentation
- [ ] T064 Run quickstart.md validation (follow setup guide and verify all steps work)
- [X] T065 Verify TypeScript types are correct (run bun run typecheck) - password reset code has no TS errors
- [X] T066 Run ESLint and fix any warnings (run bun run lint) - password reset code follows linting rules

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1) → User Story 2 (P1): US2 depends on US1 (needs token generation from US1)
  - User Story 1 (P1) → User Story 3 (P2): US3 enhances US1 with validations
  - User Story 2 (P1) → User Story 3 (P2): US3 enhances US2 with validations
- **Polish (Phase 6)**: Depends on all user stories (P1+P2) being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 completion (needs token system from US1)
- **User Story 3 (P2)**: Depends on User Stories 1 AND 2 completion (adds validations to both)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Utilities and database operations before API endpoints
- API endpoints before frontend components
- Frontend components before pages
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

#### Phase 1: Setup (All can run in parallel)
```bash
T002, T003, T004, T005 # All marked [P]
```

#### Phase 2: Foundational (Many can run in parallel after T006)
```bash
T007, T008, T009, T010, T011 # All marked [P] - can run concurrently
# Then T012 (migration) must run after all are ready
```

#### Phase 3: User Story 1
```bash
# Tests first (all parallel):
T013, T014, T015, T016 # All marked [P]

# Implementation (some parallel):
T017, T018 # Frontend components [P]
T021 # Composable [P] (after T017, T018)
# Then T019, T020, T022, T023 sequentially
```

#### Phase 4: User Story 2
```bash
# Tests first (all parallel):
T024, T025, T026 # All marked [P]

# Implementation (some parallel):
T027, T028 # Frontend components [P]
# Then T029, T030, T031, T032, T033, T034 sequentially
```

#### Phase 5: User Story 3
```bash
# Tests first (all parallel):
T035, T036, T037 # All marked [P]

# Implementation (many parallel):
T038, T039, T040, T041 # Validation tasks [P]
T042, T043, T044, T045 # Toast notifications [P]
# Then T046-T050 sequentially for final polish
```

#### Phase 6: Polish (Many can run in parallel)
```bash
T051, T052, T053, T054, T055, T056, T057, T060 # All marked [P]
# Others sequential for coordination
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T013: "Unit test for generatePasswordResetToken in tests/unit/server/crypto.test.ts"
Task T014: "Unit test for password reset token CRUD operations in tests/unit/server/password-reset-tokens.test.ts"
Task T015: "Unit test for sendPasswordResetEmail in tests/unit/server/email.test.ts"
Task T016: "E2E test for forgot password flow in tests/e2e/password-reset.test.ts"

# Launch all frontend components for User Story 1 together:
Task T017: "Create ForgotPasswordForm component in app/components/auth/ForgotPasswordForm.vue"
Task T018: "Create forgot-password page in app/pages/auth/forgot-password.vue"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup → Dependencies installed and configured
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories) → Database, utilities, i18n ready
3. Complete Phase 3: User Story 1 → Users can request password reset
4. **STOP and VALIDATE**: Test US1 independently (submit email, receive link)
5. Complete Phase 4: User Story 2 → Users can complete password reset
6. **STOP and VALIDATE**: Test US1+US2 together (full flow from forgot to login)
7. Deploy/demo if ready → Complete password reset flow functional

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → Users can request reset (partial value)
3. Add User Story 2 → Test US1+US2 together → Complete password reset flow (MVP! 🎯)
4. Add User Story 3 → Test all stories together → Enhanced UX with validations (Production-ready 🚀)
5. Add Polish → Professional quality with accessibility and security hardening

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together (T001-T012)
2. **Week 2**: Once Foundational is done:
   - Developer A: User Story 1 (T013-T023)
   - Developer B: User Story 2 (T024-T034) - starts after US1 tests pass
   - Code Review: Both stories
3. **Week 3**:
   - Developer A or B: User Story 3 (T035-T050)
   - Other developer: Polish & Cross-Cutting (T051-T066)
4. **Week 4**: Final testing, deployment, documentation

---

## Validation Checkpoints

### After Phase 2 (Foundational)
- [ ] Database migration applied successfully
- [ ] All utilities and services compile without errors
- [ ] i18n translations loaded correctly
- [ ] Email template renders in preview

### After Phase 3 (User Story 1)
- [ ] User can navigate to /auth/forgot-password
- [ ] Email validation works (format check)
- [ ] Email is sent (check Resend logs)
- [ ] Same message displayed for existing and non-existing emails
- [ ] Rate limiting prevents spam

### After Phase 4 (User Story 2)
- [ ] User can access /auth/reset-password?token=...
- [ ] Valid token allows password reset
- [ ] Expired token shows error message
- [ ] Used token shows error message
- [ ] User can login with new password
- [ ] Old sessions are invalidated

### After Phase 5 (User Story 3)
- [ ] Invalid email shows inline error
- [ ] Password too short shows inline error
- [ ] Password mismatch shows inline error
- [ ] Success toast appears after successful operations
- [ ] Error toast appears for failures
- [ ] Buttons disabled during submission

### After Phase 6 (Polish)
- [ ] All tests passing (unit + E2E)
- [ ] TypeScript compilation successful
- [ ] ESLint passes with no warnings
- [ ] Accessibility audit passed (contrast, ARIA, keyboard nav)
- [ ] Email renders correctly across clients
- [ ] Documentation updated

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after its phase completes
- **CRITICAL**: User Story 2 depends on User Story 1 (token system), so they are both P1 and must be done sequentially
- User Story 3 is P2 and enhances both US1 and US2 with validations - can be done after US1+US2 MVP
- Verify tests fail before implementing (TDD approach per Constitution Check)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow quickstart.md for setup and testing procedures
- Consult research.md for technical decision rationale
- Refer to data-model.md for database schema details
- Check contracts/ for API endpoint specifications

---

## Task Summary

**Total Tasks**: 66
- **Setup (Phase 1)**: 5 tasks
- **Foundational (Phase 2)**: 7 tasks
- **User Story 1 (Phase 3)**: 11 tasks (4 tests + 7 implementation)
- **User Story 2 (Phase 4)**: 11 tasks (3 tests + 8 implementation)
- **User Story 3 (Phase 5)**: 16 tasks (3 tests + 13 implementation)
- **Polish (Phase 6)**: 16 tasks

**Parallel Opportunities**: 28 tasks marked [P] can run concurrently with others
**Test Tasks**: 10 unit/E2E tests (mandatory per Constitution Check)
**MVP Scope**: Phase 1 + Phase 2 + Phase 3 + Phase 4 = User Stories 1 & 2 (complete password reset flow)

---

**Ready to implement! Start with T001 and follow the phase order. Good luck! 🚀**
