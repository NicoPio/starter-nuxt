# Research: Admin User Management

**Feature**: 002-admin-user-management
**Date**: 2025-12-02
**Status**: Complete (No unknowns - existing stack)

## Overview

This feature extends existing admin infrastructure built in `001-saas-starter-foundation`. All core technologies, patterns, and architectural decisions are already established. This document captures the rationale for technical choices and integration patterns.

## Technology Stack (Decided)

### Decision: Use Existing Nuxt 4 + Better Auth Stack

**Rationale**:
- Complete auth system already implemented with Better Auth v1.4.2
- Role system (Admin, Contributor, User) already exists on `user` table
- Middleware for admin protection (`admin.ts`) already in place
- API endpoints for user management partially implemented
- Nuxt UI component library provides accessible, styled components
- i18n system via Nuxt Content already configured (FR/EN)

**Alternatives Considered**:
- ❌ Build standalone admin panel: Would duplicate auth/middleware logic
- ❌ Use different UI framework: Breaks design consistency
- ❌ Implement custom role system: Reinvents existing Better Auth setup

**Supporting Evidence**:
- `app/middleware/admin.ts`: Role-based access control exists
- `app/composables/useRole.ts`: Role hierarchy utility exists
- `server/api/admin/users/`: Base API structure exists
- `app/types/common.types.ts`: UserRole and UserWithRole types exist
- CLAUDE.md confirms: "Role-Based Access Control (RBAC)" section

## API Design Patterns

### Decision: Server-Side Pagination with Query Parameters

**Rationale**:
- Spec requires "under 2 seconds for 10,000 users" (SC-001)
- Client-side pagination infeasible with 10k+ records
- Standard REST pattern: `?page=1&limit=20&role=Admin`
- Existing `GET /api/admin/users` endpoint needs enhancement

**Implementation Pattern**:
```typescript
// Query structure
GET /api/admin/users?page=1&limit=20&role=Admin&search=john

// Response structure
{
  users: User[],
  pagination: { page, limit, total, totalPages },
  filters: { role, search }
}
```

**Alternatives Considered**:
- ❌ Cursor-based pagination: Overkill for admin UI, adds complexity
- ❌ Load all + filter client-side: Violates performance requirements
- ❌ GraphQL: Not part of existing stack, adds dependency

**Supporting Evidence**:
- Industry standard for admin tables (Django Admin, Rails ActiveAdmin)
- Nuxt UI `UTable` component supports server-side pagination
- PostgreSQL `LIMIT/OFFSET` optimized for this use case

### Decision: Optimistic UI Updates with Rollback

**Rationale**:
- Spec requires "under 5 seconds" for role updates (SC-003)
- Better UX: immediate feedback + error handling
- Matches existing pattern in `ProfileForm.vue` (updates user, shows toast)

**Implementation Pattern**:
```typescript
// Optimistic update pattern
const updateRole = async (userId, newRole) => {
  // 1. Update local state immediately
  users.value = users.value.map(u =>
    u.id === userId ? { ...u, role: newRole } : u
  )

  // 2. Call API
  try {
    await $fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role: newRole }
    })
    toast.success(t('admin.users.roleUpdated'))
  } catch (error) {
    // 3. Rollback on error
    users.value = users.value.map(u =>
      u.id === userId ? { ...u, role: originalRole } : u
    )
    toast.error(t('admin.users.roleUpdateFailed'))
  }
}
```

**Alternatives Considered**:
- ❌ Pessimistic updates: Slower perceived performance
- ❌ No rollback: Poor error handling UX

## Component Architecture

### Decision: Separate Components for Filters, List, Modals

**Rationale**:
- Single Responsibility Principle
- Easier testing and maintenance
- Matches Nuxt UI patterns (separate modals/dialogs)
- Existing `app/components/subscription/` follows this pattern

**Component Breakdown**:
1. `UserFilters.vue`: Role dropdown + search input
2. `UserList.vue`: Table with pagination (wraps UTable)
3. `EditUserModal.vue`: Role selection modal (uses UModal)
4. `DeleteUserDialog.vue`: Confirmation dialog (uses UModal)

**Parent-Child Communication**:
- Filters → Parent: Emit filter changes
- Parent → List: Pass filtered users + pagination
- Modals: Open via ref, emit confirm/cancel

**Alternatives Considered**:
- ❌ Single monolithic component: Hard to test, violates SRP
- ❌ Page-level components only: Limits reusability

**Supporting Evidence**:
- Existing pattern in `app/components/subscription/SubscriptionCard.vue` + `CancelDialog.vue`
- Vue Composition API best practices (separate concerns)

## Data Flow & State Management

### Decision: Composable-Based State (No Pinia)

**Rationale**:
- Admin user management is scoped to single page
- No cross-component state sharing needed
- Existing codebase uses composables (`useAuth`, `useRole`, `useUser`)
- Lighter weight than full state management library

**Composable Structure** (`useUsers.ts`):
```typescript
export function useUsers() {
  const users = ref<UserWithRole[]>([])
  const loading = ref(false)
  const pagination = ref({ page: 1, limit: 20, total: 0 })
  const filters = ref({ role: null, search: '' })

  const fetchUsers = async () => { /* ... */ }
  const updateUserRole = async (id, role) => { /* ... */ }
  const deleteUser = async (id) => { /* ... */ }

  return { users, loading, pagination, filters, fetchUsers, updateUserRole, deleteUser }
}
```

**Alternatives Considered**:
- ❌ Pinia store: Adds dependency, overkill for single-page scope
- ❌ Inline API calls: Not reusable, harder to test

**Supporting Evidence**:
- CLAUDE.md: "Prefer composables over mixins"
- Existing `useUser.ts` for profile management
- Vue 3.5 Composition API best practices

## Security & Validation

### Decision: Zod Schema Validation on Server + Client

**Rationale**:
- CLAUDE.md specifies: "Zod for schema validation"
- Server-side: Prevents malicious requests
- Client-side: Better UX (instant feedback)
- Type safety: Zod schemas generate TypeScript types

**Validation Schemas** (`server/utils/validation.ts`):
```typescript
import { z } from 'zod'

export const UpdateRoleSchema = z.object({
  role: z.enum(['Admin', 'Contributor', 'User'])
})

export const DeleteUserSchema = z.object({
  userId: z.string().uuid()
})

export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['Admin', 'Contributor', 'User']).optional(),
  search: z.string().max(100).optional()
})
```

**Alternatives Considered**:
- ❌ No validation: Security risk, poor UX
- ❌ Different libraries (Joi, Yup): Not project standard

**Supporting Evidence**:
- CLAUDE.md: "Zod for schema validation"
- Existing validation in Better Auth config

## Access Control

### Decision: Reuse Existing Middleware + Server-Side Checks

**Rationale**:
- `app/middleware/admin.ts` already protects admin routes
- Double-check auth in API endpoints (defense in depth)
- Existing pattern in `server/api/admin/users/[id]/role.patch.ts`

**Protection Layers**:
1. **Client-side**: Middleware redirects non-admins
2. **Server-side**: API endpoints verify session + role
3. **Database**: Better Auth manages sessions

**Implementation Pattern**:
```typescript
// server/api/admin/users/index.get.ts
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user || session.user.role !== 'Admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  // ... fetch users
})
```

**Alternatives Considered**:
- ❌ Client-only protection: Trivially bypassed
- ❌ New auth layer: Duplicates Better Auth

**Supporting Evidence**:
- OWASP: Never trust client-side validation alone
- Existing pattern in `server/api/admin/users/[id]/role.patch.ts:15-20`

## Edge Case Handling

### Decision: Business Logic Validation in API Layer

**Rationale**:
- Spec requires preventing self-deletion (FR-014) and last-admin deletion (FR-015)
- Server-side enforcement ensures security
- Client-side warnings improve UX

**Prevention Logic**:
```typescript
// Prevent self-deletion
if (session.user.id === targetUserId) {
  throw createError({ statusCode: 400, message: 'Cannot delete your own account' })
}

// Prevent last admin deletion
const adminCount = await db.query.user.findMany({
  where: eq(user.role, 'Admin')
}).length

if (adminCount === 1 && targetUser.role === 'Admin') {
  throw createError({ statusCode: 400, message: 'Cannot delete the last admin' })
}
```

**Client-Side Prevention**:
- Disable delete button for current user's row
- Show warning badge on last admin's delete button

**Alternatives Considered**:
- ❌ Client-only checks: Security risk
- ❌ Database constraints: Can't express "last admin" rule in SQL easily

## Internationalization

### Decision: Extend Existing Nuxt Content i18n

**Rationale**:
- `content/i18n/{locale}/admin.yml` already exists
- `useContentI18n()` composable available
- Spec requires French/English support (existing in project)

**Translation Keys** (add to `admin.yml`):
```yaml
# content/i18n/en/admin.yml
users:
  title: "User Management"
  filters:
    allRoles: "All Roles"
    adminOnly: "Admins Only"
    contributorOnly: "Contributors Only"
    userOnly: "Users Only"
  table:
    email: "Email"
    name: "Name"
    role: "Role"
    joined: "Joined"
    actions: "Actions"
  actions:
    edit: "Edit Role"
    delete: "Delete User"
    deleteConfirm: "Are you sure you want to delete this user?"
    cannotDeleteSelf: "You cannot delete your own account"
    cannotDeleteLastAdmin: "Cannot delete the last admin"
  messages:
    roleUpdated: "User role updated successfully"
    userDeleted: "User deleted successfully"
    error: "An error occurred"
```

**Alternatives Considered**:
- ❌ Hardcoded strings: Not maintainable, breaks i18n requirement
- ❌ Different i18n library: Breaks project consistency

## Performance Optimization

### Decision: Use Existing Auto-Import + Lazy Loading

**Rationale**:
- Nuxt 4 auto-imports components/composables (already configured)
- Code splitting via file-based routing (automatic)
- No additional optimization needed for admin page

**Lazy Loading Pattern** (if needed later):
```typescript
// Only load heavy components when modal opens
const EditUserModal = defineAsyncComponent(() =>
  import('~/components/admin/EditUserModal.vue')
)
```

**Current Decision**: NOT using lazy loading initially
- Admin components are small (< 200 lines each)
- Only loaded when accessing `/admin/users` (already protected)
- Premature optimization violates YAGNI

**Alternatives Considered**:
- ❌ Eager load everything: Fine for current scope
- ❌ Complex chunk splitting: Overkill for 4 small components

## Testing Strategy

### Decision: Manual E2E + TypeScript/ESLint Validation

**Rationale**:
- CLAUDE.md specifies: "Check types: `npx nuxi typecheck`, Lint: `npx eslint .`"
- Existing project has NO automated tests
- Manual testing acceptable per project standards
- Focus on type safety + linting

**Validation Checklist**:
1. ✅ TypeScript: No errors in `npx nuxi typecheck`
2. ✅ ESLint: No errors in `npx eslint .`
3. ✅ Manual: Test all 5 user stories in browser
4. ✅ Accessibility: Screen reader + keyboard navigation
5. ✅ Edge cases: Test all 8 edge cases manually

**Future Enhancement** (not in current scope):
- Unit tests for composables (Vitest)
- Component tests (Nuxt Test Utils)
- E2E tests (Playwright)

**Alternatives Considered**:
- ❌ Write tests first: Not project standard (no test infrastructure)
- ❌ Skip validation: Unacceptable (quality gate)

## Summary of Research Outcomes

**No Unknowns Resolved**: All technologies were already decided (existing stack).

**Key Decisions Documented**:
1. ✅ Use existing Nuxt 4 + Better Auth + PostgreSQL stack
2. ✅ Server-side pagination with query parameters
3. ✅ Optimistic UI updates with rollback on error
4. ✅ Component architecture: Filters, List, Modals (separate)
5. ✅ Composable-based state management (no Pinia)
6. ✅ Zod validation on server + client
7. ✅ Reuse existing middleware + add API-level checks
8. ✅ Business logic validation for edge cases (server-side)
9. ✅ Extend existing i18n via Nuxt Content
10. ✅ Manual testing + type/lint validation

**Next Phase**: Phase 1 - Data Model & Contracts
