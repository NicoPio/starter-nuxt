# Implementation Tasks: Admin User Management

**Feature**: 002-admin-user-management
**Branch**: `002-admin-user-management`
**Date**: 2025-12-02

## Overview

This document breaks down the implementation of the Admin User Management feature into executable tasks organized by user story. Each user story is independently testable and can be delivered incrementally as an MVP (Minimum Viable Product).

**Total Tasks**: 27 tasks across 7 phases
**Parallel Opportunities**: 8 parallelizable tasks marked with [P]
**Test Strategy**: Manual testing + TypeScript/ESLint validation (no automated tests per project standard)

---

## Phase 1: Setup & Infrastructure (3 tasks)

**Goal**: Prepare foundation for all user stories (API types, validation, i18n)

**Prerequisites**: Existing Better Auth setup, Nuxt UI, middleware (already complete from 001-saas-starter-foundation)

### Tasks

- [X] T001 [P] Add shared TypeScript types for user management in app/types/common.types.ts
- [X] T002 [P] Create Zod validation schemas in server/utils/validation.ts
- [X] T003 [P] Add i18n translation keys to content/i18n/en/admin.yml and content/i18n/fr/admin.yml

**Completion Criteria**: Types compile, schemas validate, translations load without errors

---

## Phase 2: Foundational - API Infrastructure (4 tasks)

**Goal**: Build server-side API endpoints that all user stories depend on

**Dependencies**: Phase 1 must be complete

**Why Foundational**: All client-side user stories require these API endpoints. Cannot implement US1-US4 without this infrastructure.

### Tasks

- [X] T004 Modify GET /api/admin/users endpoint to support pagination (page, limit) in server/api/admin/users/index.get.ts
- [X] T005 Add role filtering to GET /api/admin/users endpoint (role query param) in server/api/admin/users/index.get.ts
- [X] T006 Add search capability to GET /api/admin/users endpoint (search query param) in server/api/admin/users/index.get.ts
- [X] T007 Create GET /api/admin/users/stats endpoint for role counts in server/api/admin/users/stats.get.ts

**Completion Criteria**:
- API returns paginated user list with correct metadata (page, limit, total, totalPages)
- Role filter works (Admin, Contributor, User)
- Search filters by email or name (case-insensitive)
- Stats endpoint returns role counts {role, count}[]

**Independent Test**: Use curl or Postman to test all endpoints:
```bash
curl "http://localhost:3000/api/admin/users?page=1&limit=20"
curl "http://localhost:3000/api/admin/users?role=Admin"
curl "http://localhost:3000/api/admin/users?search=john"
curl "http://localhost:3000/api/admin/users/stats"
```

---

## Phase 3: User Story 1 - View All Users (Priority P1) (5 tasks)

**Goal**: Admins can view a paginated list of all users with their details

**User Story**: As an administrator, I need to view a complete list of all users in the system so that I can monitor user accounts and identify which users need management attention.

**Dependencies**: Phase 2 (API endpoints) must be complete

**Why Independent**: Delivers immediate value by providing visibility into user base. Can be shipped as MVP without other stories.

### Tasks

- [X] T008 [US1] Create useUsers composable with state management in app/composables/useUsers.ts
- [X] T009 [US1] Create UserList component with table layout in app/components/admin/UserList.vue
- [X] T010 [US1] Add pagination controls to UserList component in app/components/admin/UserList.vue
- [X] T011 [US1] Integrate UserList into existing admin users page in app/pages/admin/users.vue
- [X] T012 [US1] Add loading states and error handling to user list in app/components/admin/UserList.vue

**Completion Criteria**:
- User list displays with email, name, role, registration date columns
- Pagination controls appear when > 20 users exist
- Page navigation works (next, prev, page numbers)
- Loading spinner shows during data fetch
- Error message displays if API fails

**Independent Test**:
1. Log in as admin
2. Navigate to /admin/users
3. Verify user list loads with correct columns
4. If 20+ users: Click "Next" → page 2 loads
5. Refresh page → stays on current page
6. Stop Supabase → error message appears

**Success Criteria Met**:
- SC-001: User list loads in < 2 seconds (for 10k users)
- SC-008: Feedback appears within 2 seconds

---

## Phase 4: User Story 5 - Access Control (Priority P1) (1 task)

**Goal**: Restrict admin page to users with Admin role only

**User Story**: As the system, I need to restrict the admin page to only users with the admin role so that regular users and contributors cannot access user management features.

**Dependencies**: Phase 3 (US1) complete - page must exist before protecting it

**Why Independent**: Security feature that validates existing middleware. Can be tested independently by attempting access with different roles.

**Note**: Middleware already exists from 001-saas-starter-foundation. This task validates it works correctly.

### Tasks

- [X] T013 [US5] Verify admin middleware protects /admin/users route in app/pages/admin/users.vue (confirm definePageMeta includes 'admin' middleware)

**Completion Criteria**:
- Page includes `middleware: ['auth', 'admin']` in definePageMeta
- Non-admin users redirected to dashboard with error toast
- Unauthenticated users redirected to /login
- Admin users access page successfully

**Independent Test**:
1. Log out → Try access /admin/users → Redirect to /login ✅
2. Log in as User role → Try access /admin/users → Redirect to dashboard + error ✅
3. Log in as Contributor → Try access /admin/users → Redirect to dashboard + error ✅
4. Log in as Admin → Access /admin/users → Page loads ✅

**Success Criteria Met**:
- SC-005: 100% prevention of non-admin access

---

## Phase 5: User Story 2 - Filter Users by Role (Priority P2) (4 tasks)

**Goal**: Admins can filter the user list by role to quickly find specific user groups

**User Story**: As an administrator, I need to filter the user list by role so that I can quickly find and manage specific groups of users (e.g., all admins, all contributors).

**Dependencies**: Phase 3 (US1) complete - user list must exist before filtering it

**Why Independent**: Adds filtering capability to existing list. Delivers value by reducing time to find specific users. Can be shipped separately from US3/US4.

### Tasks

- [X] T014 [P] [US2] Create UserFilters component with role dropdown in app/components/admin/UserFilters.vue
- [X] T015 [P] [US2] Add search input to UserFilters component in app/components/admin/UserFilters.vue
- [X] T016 [US2] Integrate UserFilters into admin users page in app/pages/admin/users.vue
- [X] T017 [US2] Add role count badges to filter options (fetch from /api/admin/users/stats) in app/components/admin/UserFilters.vue

**Completion Criteria**:
- Role filter dropdown shows: All Roles, Admin, Contributor, User
- Search input filters by email or name
- Role counts display (e.g., "Admin (5)")
- Filters update URL query params (?role=Admin&search=john)
- User list updates when filters change
- "Clear filters" option resets to all users

**Independent Test**:
1. Select "Admin" from role filter → Only admins shown
2. Clear filter → All users shown
3. Type "john" in search → Only matching users shown
4. Combine filters: role=Admin + search=john → Correct subset shown
5. Check role counts: "Admin (5)" matches actual count

**Success Criteria Met**:
- SC-002: Filter results appear in < 1 second
- SC-008: Feedback within 2 seconds

---

## Phase 6: User Story 3 - Edit User Role (Priority P3) (5 tasks)

**Goal**: Admins can change a user's role to grant or revoke permissions

**User Story**: As an administrator, I need to change a user's role so that I can grant or revoke permissions based on organizational needs.

**Dependencies**: Phase 3 (US1) complete - user list must exist to edit users from it

**Why Independent**: Role editing is a standalone capability. Can be shipped without delete functionality (US4). Delivers value by enabling access control management.

### Tasks

- [X] T018 [P] [US3] Create EditUserModal component with role selector in app/components/admin/EditUserModal.vue
- [X] T019 [US3] Add "Edit" button to each user row in UserList component in app/components/admin/UserList.vue
- [X] T020 [US3] Implement updateUserRole method in useUsers composable with optimistic updates in app/composables/useUsers.ts
- [X] T021 [US3] Modify PATCH /api/admin/users/[id]/role endpoint to add validation in server/api/admin/users/[id]/role.patch.ts
- [X] T022 [US3] Add error handling and rollback for failed role updates in app/composables/useUsers.ts

**Completion Criteria**:
- "Edit" button appears on each user row
- Modal opens with current role selected
- Role options: Admin, Contributor, User (radio buttons or select)
- Save button triggers PATCH /api/admin/users/{id}/role
- Success toast: "User role updated successfully"
- User row updates immediately (optimistic UI)
- On error: Rollback to original role + error toast
- Cancel button closes modal without changes

**Independent Test**:
1. Click "Edit" on a User role account
2. Change role to "Contributor"
3. Click "Save"
4. Verify: Success toast appears
5. Verify: Role updates in user list
6. Refresh page → Role persists
7. Try changing to same role → No API call (optimization)
8. Simulate network error → Error toast + rollback

**Success Criteria Met**:
- SC-003: Role update completes in < 5 seconds
- SC-008: Feedback within 2 seconds

---

## Phase 7: User Story 4 - Delete User (Priority P4) (4 tasks)

**Goal**: Admins can delete user accounts to remove inactive or unauthorized users

**User Story**: As an administrator, I need to delete user accounts so that I can remove inactive, duplicate, or unauthorized accounts from the system.

**Dependencies**: Phase 3 (US1) complete - user list must exist to delete users from it

**Why Independent**: Deletion is a standalone capability. Can be shipped last as it's the most destructive action. Delivers value by enabling account cleanup.

### Tasks

- [X] T023 [P] [US4] Create DeleteUserDialog component with confirmation message in app/components/admin/DeleteUserDialog.vue
- [X] T024 [US4] Add "Delete" button to each user row in UserList component with disabled state for self in app/components/admin/UserList.vue
- [X] T025 [US4] Implement deleteUser method in useUsers composable with optimistic updates in app/composables/useUsers.ts
- [X] T026 [US4] Modify DELETE /api/admin/users/[id] endpoint to add business logic checks (self-deletion, last admin) in server/api/admin/users/[id]/index.delete.ts

**Completion Criteria**:
- "Delete" button appears on each user row
- Delete button DISABLED for current admin's row
- Confirmation dialog shows: "Are you sure you want to delete {email}?"
- Confirm button triggers DELETE /api/admin/users/{id}
- Success toast: "User deleted successfully"
- User disappears from list immediately (optimistic UI)
- On error: Error toast with reason
- Server prevents self-deletion (400 error)
- Server prevents last admin deletion (400 error)
- Pagination recalculates after deletion

**Independent Test**:
1. Click "Delete" on a User role account
2. Dialog appears with email in message
3. Click "Confirm"
4. Verify: Success toast appears
5. Verify: User disappears from list
6. Refresh page → User gone from database
7. Try delete own account → Button disabled
8. If only 1 admin: Try delete → Error: "Cannot delete last admin"
9. Simulate network error → Error toast (no optimistic removal)

**Success Criteria Met**:
- SC-004: Deletion completes in < 5 seconds
- SC-006: 100% confirmation required before deletion
- SC-007: 100% prevention of self/last-admin deletion
- SC-008: Feedback within 2 seconds

---

## Phase 8: Polish & Cross-Cutting Concerns (1 task)

**Goal**: Validate code quality and ensure all requirements met

**Dependencies**: All user stories (US1-US5) complete

### Tasks

- [X] T027 Run TypeScript type check and ESLint validation, fix all errors (npx nuxi typecheck && npx eslint .)

**Completion Criteria**:
- `npx nuxi typecheck` passes with 0 errors
- `npx eslint .` passes with 0 errors
- All translation keys exist in EN and FR
- All components have proper TypeScript types
- All API endpoints have Zod validation

**Final Validation Checklist**:
- ✅ All 5 user stories tested manually
- ✅ All 8 edge cases verified
- ✅ All 18 functional requirements met
- ✅ All 8 success criteria validated
- ✅ Accessibility: Keyboard navigation + screen reader
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ i18n works in French and English

---

## Dependencies Graph

```
Phase 1: Setup
├─ T001 [P] Types
├─ T002 [P] Validation
└─ T003 [P] i18n
     ↓
Phase 2: Foundational APIs (BLOCKING)
├─ T004 Pagination
├─ T005 Role filter
├─ T006 Search
└─ T007 Stats endpoint
     ↓
Phase 3: US1 (P1) - View Users ─────────┐
├─ T008 useUsers composable            │
├─ T009 UserList component             │
├─ T010 Pagination UI                  │
├─ T011 Integration                    │
└─ T012 Loading/errors                 │
     ↓                                  │
Phase 4: US5 (P1) - Access Control     │
└─ T013 Verify middleware              │
     ↓                                  │
Phase 5: US2 (P2) - Filter ────────────┤
├─ T014 [P] UserFilters                │
├─ T015 [P] Search input               │
├─ T016 Integration                    │
└─ T017 Role counts                    │
     │                                  │
Phase 6: US3 (P3) - Edit Role ─────────┤
├─ T018 [P] EditUserModal              │
├─ T019 Edit button                    │
├─ T020 Update logic                   │
├─ T021 API validation                 │
└─ T022 Error handling                 │
     │                                  │
Phase 7: US4 (P4) - Delete User ───────┤
├─ T023 [P] DeleteUserDialog           │
├─ T024 Delete button                  │
├─ T025 Delete logic                   │
└─ T026 API business logic             │
     │                                  │
     ↓                                  │
Phase 8: Polish ◄──────────────────────┘
└─ T027 Quality validation
```

**Key Dependencies**:
- Phase 2 BLOCKS all user stories (foundational APIs required)
- US1 (View) must complete before US5 (Access Control) - need page to protect
- US1 (View) must complete before US2, US3, US4 - need list to filter/edit/delete from
- US2, US3, US4 are INDEPENDENT of each other - can be developed in parallel after US1

---

## Parallel Execution Examples

### Phase 1 (All Parallel)
```bash
# Can run simultaneously (different files)
- T001 [P] Types (app/types/common.types.ts)
- T002 [P] Validation (server/utils/validation.ts)
- T003 [P] i18n (content/i18n/*/admin.yml)
```

### Phase 2 (Sequential - same file)
```bash
# Must run in order (all modify server/api/admin/users/index.get.ts)
T004 → T005 → T006
# T007 can run parallel (different file: stats.get.ts)
```

### Phase 5 (Partial Parallel)
```bash
# Can run simultaneously (different components)
- T014 [P] UserFilters component
- T015 [P] Search input (part of UserFilters)
# Then sequential:
T016 → T017 (integration, depends on T014/T015)
```

### Phase 6 (Partial Parallel)
```bash
# Can run simultaneously (different concerns)
- T018 [P] EditUserModal component
- T021 API validation (server-side)
# Then sequential:
T019 → T020 → T022 (UI integration, depends on T018)
```

### Phase 7 (Partial Parallel)
```bash
# Can run simultaneously (different concerns)
- T023 [P] DeleteUserDialog component
- T026 API business logic (server-side)
# Then sequential:
T024 → T025 (UI integration, depends on T023)
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phase 1 + Phase 2 + Phase 3 + Phase 4 = Minimum Shippable Increment**

This delivers:
- ✅ Admin can view paginated user list (US1)
- ✅ Access control enforced (US5)
- ✅ Basic user visibility and monitoring

**Value**: Admins gain visibility into user base immediately. Can monitor accounts before implementing management actions.

### Incremental Delivery

**Iteration 1** (MVP):
- Phase 1: Setup (3 tasks)
- Phase 2: APIs (4 tasks)
- Phase 3: View Users (5 tasks)
- Phase 4: Access Control (1 task)
- **Total**: 13 tasks → 48% of feature

**Iteration 2** (Filtering):
- Phase 5: Filter Users (4 tasks)
- **Total**: +4 tasks → 63% of feature
- **Value**: Admins can now find specific user groups quickly

**Iteration 3** (Role Management):
- Phase 6: Edit Role (5 tasks)
- **Total**: +5 tasks → 81% of feature
- **Value**: Admins can now manage permissions

**Iteration 4** (Account Cleanup):
- Phase 7: Delete Users (4 tasks)
- **Total**: +4 tasks → 96% of feature
- **Value**: Admins can now remove unauthorized accounts

**Iteration 5** (Polish):
- Phase 8: Quality Validation (1 task)
- **Total**: 27 tasks → 100% complete

### Test-Driven Approach (Optional)

**Note**: Current project does not use automated tests per CLAUDE.md. Manual testing + TypeScript/ESLint validation is the standard.

If tests are requested in future:
1. Add test tasks BEFORE implementation tasks in each phase
2. Use pattern: `T00X [P] Write tests for [component]` → `T00Y Implement [component]`
3. Tools: Vitest (unit tests), Nuxt Test Utils (component tests)

---

## Quality Gates

**After Each Phase**:
- [ ] All tasks in phase complete (checkboxes marked)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without errors
- [ ] Manual testing confirms phase goal met

**Before Phase 8**:
- [ ] All user stories (US1-US5) independently tested
- [ ] All edge cases verified
- [ ] All functional requirements met (FR-001 to FR-018)
- [ ] All success criteria validated (SC-001 to SC-008)

**Final Release Gate**:
- [ ] T027 (TypeScript + ESLint) passes
- [ ] All translations complete (EN + FR)
- [ ] Accessibility validated (keyboard + screen reader)
- [ ] Performance targets met (SC-001 to SC-004)
- [ ] Security validated (SC-005 to SC-007)

---

## Notes

**File Modifications** (existing files):
- `app/pages/admin/users.vue` - Integration point for all components
- `app/composables/useUsers.ts` - New composable for state management
- `server/api/admin/users/index.get.ts` - Add pagination, filtering, search
- `server/api/admin/users/[id]/role.patch.ts` - Add validation
- `server/api/admin/users/[id]/delete.ts` - Add business logic checks

**New Files Created**:
- `app/components/admin/UserList.vue` (US1)
- `app/components/admin/UserFilters.vue` (US2)
- `app/components/admin/EditUserModal.vue` (US3)
- `app/components/admin/DeleteUserDialog.vue` (US4)
- `server/api/admin/users/stats.get.ts` (US2)
- `server/utils/validation.ts` (Setup)

**No Database Changes**: All functionality uses existing Better Auth `user` table.

**No New Middleware**: Existing `admin.ts` middleware already protects routes.

**Estimated Time**:
- Phase 1: 1 hour
- Phase 2: 2 hours
- Phase 3 (US1): 3 hours
- Phase 4 (US5): 15 minutes
- Phase 5 (US2): 2 hours
- Phase 6 (US3): 3 hours
- Phase 7 (US4): 3 hours
- Phase 8: 1 hour
- **Total**: ~15 hours (with manual testing)
