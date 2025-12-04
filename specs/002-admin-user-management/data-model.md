# Data Model: Admin User Management

**Feature**: 002-admin-user-management
**Date**: 2025-12-02
**Status**: Defined

## Overview

This feature reuses the existing Better Auth database schema without modifications. The `user` table already contains all necessary fields for user management, including the `role` field added in the `001-saas-starter-foundation` feature.

**Key Principle**: NO new tables or schema changes required. This is purely a UI/API enhancement over existing data.

## Existing Entities (Reused)

### User Entity

**Source**: Better Auth `user` table with `role` field extension

**Purpose**: Represents a user account in the system with authentication credentials and role-based permissions.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique identifier for the user |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User's email address (login credential) |
| `name` | VARCHAR(255) | NOT NULL | User's full name |
| `emailVerified` | BOOLEAN | NOT NULL, DEFAULT false | Whether email is verified |
| `image` | VARCHAR(500) | NULLABLE | Profile image URL |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'User' | User's role (Admin, Contributor, User) |

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- INDEX on `role` (for filtering queries)
- INDEX on `createdAt` (for sorting)

**Validation Rules**:
- `email`: Must be valid email format, unique across all users
- `name`: Minimum 1 character, maximum 255 characters
- `role`: Must be one of: 'Admin', 'Contributor', 'User'
- Cannot delete user if:
  - User is the currently authenticated admin (self-deletion)
  - User is the last admin in the system (last-admin deletion)

**Relationships**:
- ONE user → MANY sessions (Better Auth `session` table)
- ONE user → MANY accounts (Better Auth `account` table for OAuth)
- ONE user → MANY verification tokens (Better Auth `verification` table)

**State Transitions**:
```
User Creation:
[No User] --signup--> [User with role='User']

Role Changes:
[User] --admin updates--> [Contributor] --admin updates--> [Admin]
[Admin] --admin updates--> [Contributor] --admin updates--> [User]

User Deletion:
[User/Contributor] --admin deletes--> [Deleted]
[Admin] --admin deletes--> [Deleted] (BLOCKED if last admin or self)
```

### Role (Enum/Type - Not a Table)

**Source**: TypeScript enum in `app/types/common.types.ts`

**Purpose**: Defines the three permission levels in the system.

**Values**:
- `Admin`: Full system access, including user management
- `Contributor`: Elevated access, cannot manage users
- `User`: Standard user access

**Hierarchy**:
```
Admin (3) > Contributor (2) > User (1)
```

**Usage**:
- Stored as VARCHAR in `user.role` field
- Validated via Zod schema: `z.enum(['Admin', 'Contributor', 'User'])`
- Used in middleware for route protection
- Used in API endpoints for authorization checks

## Data Access Patterns

### Query Patterns

**1. List Users with Pagination and Filtering**

```sql
-- Base query (all users)
SELECT id, email, name, role, "createdAt"
FROM user
ORDER BY "createdAt" DESC
LIMIT 20 OFFSET 0;

-- With role filter
SELECT id, email, name, role, "createdAt"
FROM user
WHERE role = 'Admin'
ORDER BY "createdAt" DESC
LIMIT 20 OFFSET 0;

-- With search (email or name)
SELECT id, email, name, role, "createdAt"
FROM user
WHERE (email ILIKE '%search%' OR name ILIKE '%search%')
ORDER BY "createdAt" DESC
LIMIT 20 OFFSET 0;

-- Combined (role + search)
SELECT id, email, name, role, "createdAt"
FROM user
WHERE role = 'Admin'
  AND (email ILIKE '%search%' OR name ILIKE '%search%')
ORDER BY "createdAt" DESC
LIMIT 20 OFFSET 0;

-- Count total (for pagination)
SELECT COUNT(*) as total FROM user WHERE role = 'Admin';
```

**Performance Notes**:
- INDEX on `role` ensures fast filtering (< 100ms for 10k users)
- INDEX on `createdAt` ensures fast sorting
- LIMIT/OFFSET efficient for pagination (use cursor-based if > 100k users)

**2. Get User Count by Role (for filter badges)**

```sql
SELECT
  role,
  COUNT(*) as count
FROM user
GROUP BY role;

-- Result:
-- { role: 'Admin', count: 5 }
-- { role: 'Contributor', count: 12 }
-- { role: 'User', count: 9983 }
```

**3. Update User Role**

```sql
UPDATE user
SET role = 'Admin', "updatedAt" = NOW()
WHERE id = 'user-uuid-here';
```

**Validation Before Update**:
- Verify new role is valid enum value
- Verify requesting user is Admin
- Verify target user exists

**4. Delete User**

```sql
-- Safety checks first
SELECT role FROM user WHERE id = 'target-user-id';
SELECT COUNT(*) FROM user WHERE role = 'Admin';

-- Then delete
DELETE FROM user WHERE id = 'target-user-id';
```

**Validation Before Delete**:
- Verify target user exists
- Prevent if target user ID == authenticated user ID (self-deletion)
- Prevent if target user role == 'Admin' AND admin count == 1 (last admin)

**Cascade Effects** (handled by Better Auth):
- ON DELETE CASCADE for `session` table (sessions deleted)
- ON DELETE CASCADE for `account` table (OAuth links deleted)
- ON DELETE CASCADE for `verification` table (tokens deleted)

## Data Consistency Rules

**1. Role Integrity**
- Every user MUST have a role
- Role MUST be one of: 'Admin', 'Contributor', 'User'
- Enforced by: Database DEFAULT, Zod validation, TypeScript types

**2. Admin Existence**
- System MUST have at least 1 admin at all times
- Enforced by: API business logic (not database constraint)
- First user created is promoted to Admin (existing behavior)

**3. Email Uniqueness**
- Every user MUST have unique email
- Enforced by: UNIQUE INDEX on `email` column
- Better Auth handles duplicate email prevention on signup

**4. Audit Trail** (Future Enhancement)
- Currently: Only `updatedAt` timestamp tracks changes
- Future: Add audit log table for role changes (not in current scope)

## TypeScript Types (Existing)

**Location**: `app/types/common.types.ts`

```typescript
// Role enum
export type UserRole = 'Admin' | 'Contributor' | 'User'

// User with role (extends Better Auth User)
export interface UserWithRole {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
  role: UserRole
}

// Pagination metadata
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Filter options
export interface UserFilters {
  role?: UserRole
  search?: string
}

// API response for user list
export interface UserListResponse {
  users: UserWithRole[]
  pagination: PaginationMeta
  filters: UserFilters
}
```

## Database Adapter Usage

**ORM**: Direct SQL via Better Auth's database adapter (or raw queries if needed)

**Example** (using Better Auth adapter pattern):

```typescript
import { auth } from '~/server/utils/auth'

// Get database adapter
const adapter = auth.options.database

// Query users with pagination
const users = await adapter.query(`
  SELECT id, email, name, role, "createdAt"
  FROM user
  WHERE role = $1
  ORDER BY "createdAt" DESC
  LIMIT $2 OFFSET $3
`, [role, limit, offset])

// Update user role
await adapter.execute(`
  UPDATE user SET role = $1, "updatedAt" = NOW()
  WHERE id = $2
`, [newRole, userId])

// Delete user
await adapter.execute(`
  DELETE FROM user WHERE id = $1
`, [userId])
```

## Data Volume & Scale

**Expected Scale**:
- Initial: < 100 users
- Target: 10,000 users (per spec SC-001)
- Maximum: 100,000 users (future-proofing)

**Performance Targets**:
- List query: < 2 seconds for 10k users (SC-001)
- Filter query: < 1 second (SC-002)
- Update/Delete: < 5 seconds total (SC-003, SC-004)

**Optimization Strategy**:
- Current: Indexes on `role` and `createdAt`
- If > 100k users: Consider cursor-based pagination
- If > 1M users: Consider read replicas or materialized views

## Migration Requirements

**Status**: NO MIGRATIONS NEEDED

The `user` table already exists with all required fields:
- Created by: Better Auth migration
- Extended by: `001-saas-starter-foundation` (added `role` field)
- Used by: This feature (no changes)

**Future Migrations** (not in current scope):
- Add audit log table for tracking role changes
- Add soft delete (deleted_at column) instead of hard delete
- Add last_login timestamp for monitoring active users

## Summary

**Entities**: 1 (User - existing)
**New Tables**: 0
**New Fields**: 0
**Indexes**: Existing (role, createdAt)
**Relationships**: Managed by Better Auth
**Migrations**: None required
**Data Access**: Direct SQL via adapter or ORM
**Performance**: Optimized for 10k users, scalable to 100k
