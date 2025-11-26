# Implementation Tasks: SaaS Starter Foundation

**Branch**: `001-saas-starter-foundation`
**Feature Spec**: [spec.md](./spec.md)
**Implementation Plan**: [plan.md](./plan.md)
**Created**: 2025-11-25

## Task Organization

Tasks are organized by **User Story** for independent implementation and testing. Each user story can be delivered as a standalone MVP increment.

**Total Tasks**: 65
**User Stories**: 5 (3 P1, 2 P2, 1 P3)
**Parallel Opportunities**: 45 parallelizable tasks marked with [P]

---

## Phase 1: Setup & Environment

**Goal**: Initialize project with required dependencies and configuration

- [X] T001 Install new dependencies: @nuxtjs/supabase, @nuxtjs/i18n, stripe, zod
- [X] T002 Create .env.example with all required environment variables from quickstart.md
- [X] T003 Update nuxt.config.ts to add @nuxtjs/supabase and @nuxtjs/i18n modules
- [X] T004 [P] Create locales/en.json with initial English translations
- [X] T005 [P] Create locales/fr.json with initial French translations
- [ ] T006 Setup Supabase local instance via Docker Compose (follow quickstart.md)
- [ ] T007 Run database migration from data-model.md to create profiles, subscriptions, payment_config tables

---

## Phase 2: Foundational Layer

**Goal**: Shared infrastructure needed by all user stories

- [X] T008 [P] Create app/plugins/supabase.ts for Supabase client initialization
- [X] T009 [P] Create server/utils/supabase.ts for server-side Supabase client
- [X] T010 [P] Create server/utils/stripe.ts for Stripe SDK initialization
- [X] T011 [P] Create app/composables/useToast.ts for toast notifications (Nuxt UI)
- [X] T012 [P] Create app/middleware/auth.ts for authentication check
- [X] T013 [P] Create app/middleware/guest.ts for redirecting authenticated users
- [X] T014 [P] Create server/utils/schemas.ts with Zod validation schemas from data-model.md
- [X] T015 [P] Create app/layouts/default.vue for public pages layout
- [X] T016 [P] Create app/layouts/dashboard.vue for authenticated pages layout
- [X] T017 [P] Create app/layouts/admin.vue for admin pages layout

---

## Phase 3: User Story 1 - Public User Access (P1)

**Story Goal**: Visitors can browse public landing pages and free content

**Independent Test**: Navigate to homepage and public pages without auth, verify content loads and restricted pages redirect to login

**Implementation**:

- [X] T018 [P] [US1] Update app/pages/index.vue to serve as public landing page
- [X] T019 [P] [US1] Create content/pages/features.md for free content page
- [X] T020 [P] [US1] Create app/pages/features.vue to display free content from Nuxt Content
- [X] T021 [US1] Add route protection: authenticated users can access /dashboard (test redirect)

**MVP Complete After This Phase** ✅

---

## Phase 4: User Story 2 - User Account Management (P1)

**Story Goal**: Users can create accounts, login, and manage their profiles

**Independent Test**: Complete signup → login → edit profile → verify data persisted

**Implementation**:

### Authentication UI
- [X] T022 [P] [US2] Create app/components/auth/SignupForm.vue with email/password fields and Zod validation
- [X] T023 [P] [US2] Create app/components/auth/LoginForm.vue with email/password and "remember me"
- [X] T024 [P] [US2] Create app/pages/signup.vue using SignupForm component
- [X] T025 [P] [US2] Create app/pages/login.vue using LoginForm component

### Authentication API
- [X] T026 [US2] Create server/api/auth/signup.post.ts endpoint (see contracts/API-SUMMARY.md)
- [X] T027 [US2] Create server/api/auth/login.post.ts endpoint
- [X] T028 [US2] Create server/api/auth/logout.post.ts endpoint

### Profile Management
- [X] T029 [P] [US2] Create app/composables/useAuth.ts for auth state management
- [X] T030 [P] [US2] Create app/composables/useUser.ts for user profile state
- [X] T031 [P] [US2] Create app/components/profile/ProfileForm.vue for editing user data
- [X] T032 [P] [US2] Create app/pages/profile.vue for profile management page
- [X] T033 [P] [US2] Create app/pages/dashboard.vue as user dashboard
- [X] T034 [US2] Create server/api/users/me.get.ts to fetch current user profile
- [X] T035 [US2] Create server/api/users/me.patch.ts to update profile

### Integration
- [X] T036 [US2] Add auth redirect: preserve original URL when redirecting to login
- [X] T037 [US2] Implement toast notifications for signup/login/profile update success/errors
- [X] T038 [US2] Add trigger in Supabase to auto-create profile + free subscription on signup (data-model.md)

---

## Phase 5: User Story 3 - Subscription Management (P2)

**Story Goal**: Users can view and manage their subscriptions

**Independent Test**: Create test subscription → view details → cancel → verify status updated

**Implementation**:

### Subscription UI
- [ ] T039 [P] [US3] Create app/composables/useSubscription.ts for subscription state
- [ ] T040 [P] [US3] Create app/components/subscription/SubscriptionCard.vue to display plan details
- [ ] T041 [P] [US3] Create app/components/subscription/CancelDialog.vue for cancellation confirmation
- [ ] T042 [P] [US3] Create app/pages/subscription.vue for subscription management page

### Subscription API
- [ ] T043 [US3] Create server/api/subscriptions/me.get.ts to fetch user subscription
- [ ] T044 [US3] Create server/api/subscriptions/cancel.post.ts for cancellation
- [ ] T045 [US3] Create server/api/subscriptions/webhook.post.ts for Stripe webhooks

### Stripe Integration
- [ ] T046 [P] [US3] Create app/plugins/stripe.ts for client-side Stripe initialization
- [ ] T047 [US3] Implement Stripe webhook signature verification in webhook endpoint
- [ ] T048 [US3] Handle subscription events: created, updated, deleted, payment_failed in webhook
- [ ] T049 [US3] Add toast notifications for subscription actions

---

## Phase 6: User Story 4 - Admin User Management (P2)

**Story Goal**: Admins can view, edit roles, and delete users

**Independent Test**: Login as admin → view users list → change role → delete test user → verify changes

**Implementation**:

### Admin UI
- [ ] T050 [P] [US4] Create app/middleware/admin.ts to check Admin role
- [ ] T051 [P] [US4] Create app/components/admin/UserTable.vue with search/filter
- [ ] T052 [P] [US4] Create app/components/admin/RoleDialog.vue for changing user roles
- [ ] T053 [P] [US4] Create app/pages/admin/index.vue as admin dashboard
- [ ] T054 [P] [US4] Create app/pages/admin/users.vue for user management

### Admin API
- [ ] T055 [US4] Create server/api/admin/users.get.ts with pagination, search, filtering
- [ ] T056 [US4] Create server/api/admin/users/[id]/role.patch.ts for role updates
- [ ] T057 [US4] Create server/api/admin/users/[id].delete.ts for user deletion
- [ ] T058 [US4] Add RLS policy check: only Admins can modify roles (verify in Supabase)

### Contributor Access
- [ ] T059 [US4] Create app/middleware/contributor.ts for Contributor role (read-only access)
- [ ] T060 [US4] Update admin/users.vue to show read-only view for Contributors

---

## Phase 7: User Story 5 - Payment Configuration (P3)

**Story Goal**: Admins can configure Stripe payment integration

**Independent Test**: Login as admin → enter Stripe keys → save → verify connection status displayed

**Implementation**:

- [ ] T061 [P] [US5] Create app/components/admin/StripeConfigForm.vue with API key fields
- [ ] T062 [P] [US5] Create app/pages/admin/config.vue for configuration page
- [ ] T063 [US5] Create server/api/admin/config/stripe.get.ts to fetch current config (public key only)
- [ ] T064 [US5] Create server/api/admin/config/stripe.post.ts to save encrypted config
- [ ] T065 [US5] Add toast notifications for config save success/failure

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Final touches and production readiness

- [ ] T066 [P] Add loading states to all forms
- [ ] T067 [P] Add error boundaries for unexpected errors
- [ ] T068 [P] Implement proper error pages (404, 500)
- [ ] T069 [P] Add meta tags and SEO optimization for public pages
- [ ] T070 [P] Verify accessibility: keyboard navigation, screen reader labels
- [ ] T071 Run full end-to-end test of all user flows
- [ ] T072 Update CLAUDE.md with implementation notes and conventions

---

## Dependencies & Execution Order

### User Story Dependencies

```
US1 (Public Access) → US2 (Auth) → US3 (Subscriptions)
                                   → US4 (Admin)
                                   → US5 (Config)
```

**Independent Stories**: US3, US4, US5 can be implemented in parallel after US2 completes

### Suggested MVP Scope

**MVP** = Phase 1 + Phase 2 + Phase 3 (US1 only)
- Delivers: Public landing page with content
- Effort: ~15 tasks, ~2-3 days
- Value: First touchpoint for all users

**MVP+** = Add Phase 4 (US2)
- Delivers: Full authentication and user management
- Effort: +17 tasks, +3-5 days
- Value: Users can sign up and use the platform

---

## Parallel Execution Examples

### Phase 2 (Foundational) - All parallelizable
```bash
# Can run simultaneously:
T008, T009, T010, T011, T012, T013, T014, T015, T016, T017
```

### Phase 4 (US2) - UI components in parallel
```bash
# Parallel UI:
T022, T023, T024, T025, T029, T030, T031, T032, T033

# Sequential API (need auth setup first):
T026 → T027 → T028 → T034 → T035

# Final integration:
T036 → T037 → T038
```

### Phase 5, 6, 7 - Stories in parallel
```bash
# After US2 completes, these can run simultaneously:
- Team A: US3 (Subscriptions) - T039-T049
- Team B: US4 (Admin) - T050-T060
- Team C: US5 (Config) - T061-T065
```

---

## Implementation Strategy

1. **Setup First** (Phase 1-2): Get environment ready - ~10 tasks
2. **MVP Delivery** (Phase 3): Public landing - ~4 tasks
3. **Core Value** (Phase 4): Auth & profiles - ~17 tasks
4. **Monetization** (Phase 5): Subscriptions - ~11 tasks
5. **Governance** (Phase 6): Admin features - ~11 tasks
6. **Configuration** (Phase 7): Stripe setup - ~5 tasks
7. **Production Ready** (Phase 8): Polish - ~7 tasks

**Total Estimated Effort**: 65 tasks ≈ 2-3 weeks (1 developer) or 1 week (3 developers in parallel)

---

## Task Format Reference

```
- [ ] T### [P] [Story] Description with file path
```

- **T###**: Sequential task ID
- **[P]**: Optional, marks parallelizable tasks
- **[Story]**: US1-US5, only for user story phases
- **Description**: Clear action with exact file path

**Status**: ✅ Tasks ready for implementation via `/speckit.implement`
