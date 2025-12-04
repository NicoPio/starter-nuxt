# Implementation Plan: Admin User Management

**Branch**: `002-admin-user-management` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-admin-user-management/spec.md`

## Summary

This feature implements a comprehensive admin user management interface that allows administrators to view, filter, edit roles, and delete user accounts. The implementation extends the existing Better Auth-based role system (Admin, Contributor, User) with a dedicated admin page protected by role-based middleware. The interface provides pagination, real-time filtering, and safeguards against destructive operations (preventing self-deletion and last-admin deletion).

**Technical Approach**: Leverage existing Nuxt 4 + Vue 3.5 architecture with Nuxt UI components, Better Auth role system, and PostgreSQL database. Build server-side API endpoints with proper authorization checks and client-side Vue pages/components with reactive state management.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Nuxt 4.2.1, Vue 3.5, Node.js 18+
**Primary Dependencies**:
- Frontend: Nuxt UI (component library), @nuxt/content (i18n), Vue 3.5
- Backend: Better Auth v1.4.2 (authentication/sessions), Drizzle ORM (if needed), PostgreSQL via Supabase
- Validation: Zod (schema validation)

**Storage**: PostgreSQL (self-hosted Supabase) with Better Auth tables (`user`, `session`, `account`, `verification`)
**Testing**: Nuxt Test Utils, Vitest (unit tests), manual E2E validation (ESLint + TypeScript checks)
**Target Platform**: Web application (SSR/Client-side), modern browsers
**Project Type**: Web application (Nuxt 4 full-stack)

**Performance Goals**:
- User list load < 2s for 10k users
- Filter operations < 1s
- CRUD operations < 5s end-to-end

**Constraints**:
- Must use existing Better Auth role system (no new auth layer)
- Must maintain compatibility with existing middleware (admin.ts, auth.ts, guest.ts)
- Must follow Nuxt UI design system and accessibility patterns
- Must support French/English i18n

**Scale/Scope**:
- Support 10,000+ user accounts
- Pagination: 20 users per page (configurable)
- 5 user stories, 18 functional requirements, 8 edge cases

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Constitution Status**: No project constitution file exists (template only). Proceeding with industry best practices and existing codebase patterns.

**Applied Principles** (inferred from CLAUDE.md):
- ✅ **Type Safety**: Strict TypeScript mode, all API responses typed
- ✅ **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- ✅ **Security**: Server-side auth checks, CSRF protection via Better Auth, parameterized queries
- ✅ **Code Quality**: ESLint + TypeScript checks required, no errors allowed
- ✅ **Composable Architecture**: Use composables over mixins, `<script setup>` syntax
- ✅ **Performance**: Auto-imports, lazy loading, code splitting

**Gates**:
1. ✅ No new authentication system (use Better Auth)
2. ✅ No implementation details in spec (all WHAT/WHY, no HOW)
3. ✅ All API endpoints have Zod validation
4. ✅ All forms have loading states and error handling
5. ✅ All user-facing text uses i18n composable

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-user-management/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (IN PROGRESS)
├── research.md          # Phase 0 output (TO BE CREATED)
├── data-model.md        # Phase 1 output (TO BE CREATED)
├── quickstart.md        # Phase 1 output (TO BE CREATED)
├── contracts/           # Phase 1 output (TO BE CREATED)
├── checklists/          # Quality validation
│   └── requirements.md  # Spec validation (COMPLETE - ALL PASS)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Nuxt 4 Web Application Structure (EXISTING)

app/
├── pages/
│   └── admin/
│       ├── index.vue              # Existing admin dashboard
│       ├── users.vue               # Existing user management page
│       └── config.vue              # Existing Stripe config
│
├── components/
│   └── admin/
│       ├── UserList.vue            # NEW: User list table component
│       ├── UserFilters.vue         # NEW: Role filter component
│       ├── EditUserModal.vue       # NEW: Edit role modal
│       └── DeleteUserDialog.vue    # NEW: Delete confirmation dialog
│
├── composables/
│   ├── useAuth.ts                  # Existing auth composable
│   ├── useRole.ts                  # Existing role composable
│   ├── useUser.ts                  # Existing user composable
│   └── useUsers.ts                 # NEW: Admin user management composable
│
├── middleware/
│   ├── admin.ts                    # Existing admin-only middleware
│   ├── contributor.ts              # Existing contributor+ middleware
│   ├── auth.ts                     # Existing authenticated-only middleware
│   └── guest.ts                    # Existing guest-only middleware
│
├── types/
│   └── common.types.ts             # Existing shared types (UserRole, UserWithRole, etc.)
│
└── layouts/
    └── admin.vue                   # Existing admin layout

server/
├── api/
│   └── admin/
│       └── users/
│           ├── index.get.ts        # MODIFY: Add pagination, filtering
│           ├── [id]/
│           │   ├── role.patch.ts   # Existing role update endpoint
│           │   └── delete.ts       # Existing user deletion endpoint
│           └── stats.get.ts        # NEW: User count by role (for filters)
│
└── utils/
    ├── auth.ts                     # Existing Better Auth config
    └── validation.ts               # NEW: Zod schemas for admin operations

content/i18n/
├── en/
│   └── admin.yml                   # Existing translations
└── fr/
    └── admin.yml                   # Existing translations
```

**Structure Decision**: This is a web application using Nuxt 4 full-stack architecture. Code is organized by feature within the `app/` directory (pages, components, composables) and server-side API endpoints in `server/api/`. Existing admin infrastructure (middleware, layouts, basic pages) is already in place from the `001-saas-starter-foundation` feature. This implementation extends that foundation with enhanced user management capabilities.

**Key Integration Points**:
- **Existing APIs**: `GET /api/admin/users` (needs pagination/filtering), `PATCH /api/admin/users/[id]/role`, `DELETE /api/admin/users/[id]`
- **Existing Composables**: `useAuth()`, `useRole()`, `useContentI18n()`
- **Existing Middleware**: `admin.ts` (already protects `/admin/users` route)
- **Existing Database**: Better Auth `user` table with `role` field (Admin, Contributor, User)

## Complexity Tracking

**No Constitution violations** - proceeding with established Nuxt/Vue best practices.

**Architectural Decisions**:

| Decision | Rationale | Alternative Rejected |
|----------|-----------|---------------------|
| Extend existing `/admin/users` page | User management UI already exists, needs enhancement | Creating new admin section (unnecessary duplication) |
| Use existing Better Auth tables | `user` table has `role` field, no schema changes needed | Creating separate admin-users table (violates DRY) |
| Server-side pagination | Better performance at scale (10k+ users) | Client-side pagination (memory issues with large datasets) |
| Nuxt UI components | Consistent design system, built-in accessibility | Custom UI components (reinventing the wheel) |
| Composable for user management | Reusable logic, testable, follows Nuxt patterns | Inline API calls in components (harder to test/reuse) |

**Complexity Notes**:
- Low complexity: Extends existing admin infrastructure
- No new auth system: Reuses Better Auth role checks
- No new database tables: Uses existing `user` table
- Standard CRUD operations with pagination/filtering
