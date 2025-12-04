# Quickstart: Admin User Management

**Feature**: 002-admin-user-management
**Date**: 2025-12-02
**Audience**: Developers implementing this feature

## Prerequisites

Before implementing this feature, ensure you have:

1. ✅ **Existing Infrastructure** (from `001-saas-starter-foundation`):
   - Nuxt 4.2.1 + Vue 3.5 + TypeScript 5.9+ installed
   - Better Auth v1.4.2 configured with role system
   - PostgreSQL database (Supabase) running
   - `user` table with `role` field (Admin, Contributor, User)
   - Admin middleware (`app/middleware/admin.ts`)
   - Existing admin API endpoints (`server/api/admin/users/`)
   - Nuxt UI component library
   - i18n via Nuxt Content (FR/EN)

2. ✅ **Development Environment**:
   - Node.js 18+
   - Supabase running (`supabase start`)
   - Dev server can start (`npm run dev`)
   - At least one admin user exists in database

3. ✅ **Access**:
   - Admin account credentials for testing
   - Database access for debugging

## Quick Integration Scenarios

### Scenario 1: View User List (5 minutes)

**User Story**: As an admin, view all users with pagination

**Steps**:

1. **Start dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Log in as admin** and navigate to:
   ```
   http://localhost:3000/admin/users
   ```

3. **Expected Behavior**:
   - Page loads (protected by `admin.ts` middleware)
   - Displays existing user management table
   - Shows current users (email, name, role, registration date)
   - Pagination controls appear (if > 20 users)

4. **Test Validation**:
   - ✅ Non-admin users cannot access page (redirect to dashboard)
   - ✅ Users are listed in descending order (newest first)
   - ✅ Page numbers work if there are multiple pages

**Implementation Files** (existing):
- `app/pages/admin/users.vue` ← Modify to use new composable
- `server/api/admin/users/index.get.ts` ← Add pagination logic

---

### Scenario 2: Filter Users by Role (10 minutes)

**User Story**: As an admin, filter users by role to find specific groups

**Steps**:

1. **Add Role Filter Component**:
   - Create `app/components/admin/UserFilters.vue`
   - Add dropdown with options: All Roles, Admin, Contributor, User
   - Display user count for each role (e.g., "Admin (5)")

2. **Integrate Filter**:
   - Add `<UserFilters>` to `app/pages/admin/users.vue`
   - Emit filter changes to parent
   - Update `useUsers` composable to apply role filter

3. **Test Validation**:
   ```bash
   # Navigate to admin users page
   # Select "Admin" from role filter
   # Verify only admins are shown
   # Check count matches "Admin (X)" badge
   ```

4. **Expected Behavior**:
   - Selecting "Admin" shows only admin users
   - Filter updates URL query param: `?role=Admin`
   - Count badge updates dynamically
   - "All Roles" option clears filter

**Implementation Files** (new):
- `app/components/admin/UserFilters.vue` ← NEW
- `server/api/admin/users/stats.get.ts` ← NEW (role counts)

**API Endpoint**:
```typescript
// GET /api/admin/users/stats
{
  stats: [
    { role: "Admin", count: 5 },
    { role: "Contributor", count: 12 },
    { role: "User", count: 9983 }
  ],
  total: 10000
}
```

---

### Scenario 3: Edit User Role (15 minutes)

**User Story**: As an admin, change a user's role to grant/revoke permissions

**Steps**:

1. **Create Edit Modal Component**:
   - Create `app/components/admin/EditUserModal.vue`
   - Use Nuxt UI `<UModal>` component
   - Include role selector (Admin, Contributor, User)
   - Add Save/Cancel buttons

2. **Integrate Modal**:
   - Add "Edit" button to each user row in `UserList.vue`
   - Open modal with selected user data
   - On save, call `PATCH /api/admin/users/{id}/role`
   - Update local state optimistically

3. **Test Validation**:
   ```bash
   # Click "Edit" on a user row
   # Modal opens with current role selected
   # Change role to "Contributor"
   # Click "Save"
   # Verify:
   #   - Success toast appears
   #   - User row updates immediately (optimistic)
   #   - Role persists on page refresh
   ```

4. **Expected Behavior**:
   - Modal opens instantly (no loading spinner)
   - Role options displayed as radio buttons or select
   - Save button disabled during API call
   - Success toast: "User role updated successfully"
   - Modal closes after successful update

**Implementation Files** (new + modify):
- `app/components/admin/EditUserModal.vue` ← NEW
- `app/composables/useUsers.ts` ← NEW (manage state)
- `server/api/admin/users/[id]/role.patch.ts` ← MODIFY (existing)

**API Request**:
```typescript
PATCH /api/admin/users/550e8400-e29b-41d4-a716-446655440001/role
{
  "role": "Contributor"
}
```

**API Response**:
```typescript
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "Contributor",
    "createdAt": "2025-01-02T00:00:00Z",
    "updatedAt": "2025-12-02T10:30:00Z"
  },
  "message": "User role updated successfully"
}
```

---

### Scenario 4: Delete User (20 minutes)

**User Story**: As an admin, delete user accounts to remove inactive users

**Steps**:

1. **Create Delete Confirmation Dialog**:
   - Create `app/components/admin/DeleteUserDialog.vue`
   - Use Nuxt UI `<UModal>` component
   - Display user email in confirmation message
   - Add Confirm/Cancel buttons (destructive style)

2. **Integrate Dialog**:
   - Add "Delete" button to each user row in `UserList.vue`
   - Open dialog with selected user data
   - On confirm, call `DELETE /api/admin/users/{id}`
   - Remove user from local state optimistically

3. **Implement Business Logic Safeguards**:
   - Disable delete button for current admin's row
   - Show warning badge on last admin's delete button
   - Server-side: Prevent self-deletion and last-admin deletion

4. **Test Validation**:
   ```bash
   # Test Case 1: Delete regular user
   #   - Click "Delete" on a User role account
   #   - Dialog appears: "Are you sure you want to delete john@example.com?"
   #   - Click "Confirm"
   #   - Success toast: "User deleted successfully"
   #   - User disappears from list

   # Test Case 2: Prevent self-deletion
   #   - Try to delete your own account
   #   - Delete button should be disabled
   #   - Tooltip: "You cannot delete your own account"

   # Test Case 3: Prevent last admin deletion
   #   - If only 1 admin exists, try to delete them
   #   - Delete button shows warning badge
   #   - Server returns 400: "Cannot delete the last admin account"
   ```

5. **Expected Behavior**:
   - Confirmation dialog always appears before deletion
   - Delete button shows loading spinner during API call
   - Success toast: "User deleted successfully"
   - User removed from list immediately (optimistic)
   - Error toast if deletion fails with reason

**Implementation Files** (new + modify):
- `app/components/admin/DeleteUserDialog.vue` ← NEW
- `app/composables/useUsers.ts` ← MODIFY (add delete method)
- `server/api/admin/users/[id]/delete.ts` ← MODIFY (existing, add checks)

**API Request**:
```typescript
DELETE /api/admin/users/550e8400-e29b-41d4-a716-446655440001
```

**API Response** (success):
```typescript
{
  "message": "User deleted successfully",
  "deletedUserId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**API Response** (error - self-deletion):
```typescript
{
  "statusCode": 400,
  "message": "Cannot delete your own account"
}
```

**API Response** (error - last admin):
```typescript
{
  "statusCode": 400,
  "message": "Cannot delete the last admin account"
}
```

---

### Scenario 5: Accessibility Testing (10 minutes)

**User Story**: Ensure admin page is accessible to all users

**Steps**:

1. **Keyboard Navigation Test**:
   ```bash
   # Navigate to /admin/users
   # Tab through all interactive elements:
   #   - Role filter dropdown
   #   - Search input
   #   - Edit buttons
   #   - Delete buttons
   #   - Pagination controls
   # Verify:
   #   - All elements are reachable via Tab
   #   - Shift+Tab navigates backwards
   #   - Enter/Space activates buttons
   ```

2. **Screen Reader Test** (macOS VoiceOver):
   ```bash
   # Enable VoiceOver: Cmd+F5
   # Navigate to /admin/users
   # Verify announcements:
   #   - "User Management table, 42 users"
   #   - "Email column heading"
   #   - "Edit button for john@example.com"
   #   - "Delete button for john@example.com, disabled, You cannot delete your own account"
   ```

3. **Color Contrast Test**:
   - Use browser DevTools Accessibility Inspector
   - Verify all text has sufficient contrast (WCAG AA)
   - Check both light and dark modes

4. **Expected Behavior**:
   - All interactive elements have visible focus indicators
   - ARIA labels provide context for screen readers
   - Skip link "Skip to main content" works
   - Error messages announced to screen readers

**Accessibility Checklist**:
- ✅ `aria-label` on filter dropdown
- ✅ `aria-label` on search input
- ✅ `aria-label` on Edit/Delete buttons (include user email)
- ✅ `role="table"` on user list
- ✅ `aria-describedby` for disabled buttons (explain why)
- ✅ Focus visible on all interactive elements
- ✅ Keyboard navigation works (Tab, Enter, Escape)

---

## Common Integration Issues

### Issue 1: Middleware Not Protecting Route

**Symptom**: Non-admin users can access `/admin/users`

**Solution**:
```typescript
// app/pages/admin/users.vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'admin'], // ← Ensure both middlewares
  layout: 'admin'
})
</script>
```

### Issue 2: Pagination Breaks After Delete

**Symptom**: After deleting user, pagination shows empty page

**Solution**:
```typescript
// app/composables/useUsers.ts
const deleteUser = async (userId: string) => {
  // ... delete logic ...

  // Recalculate pagination
  pagination.value.total -= 1
  pagination.value.totalPages = Math.ceil(pagination.value.total / pagination.value.limit)

  // If current page is now out of bounds, go to last page
  if (pagination.value.page > pagination.value.totalPages) {
    pagination.value.page = Math.max(1, pagination.value.totalPages)
    await fetchUsers() // Refetch current page
  }
}
```

### Issue 3: Optimistic Update Causes UI Flicker

**Symptom**: User role changes, then flickers back, then changes again

**Solution**: Use proper rollback pattern
```typescript
const updateUserRole = async (userId: string, newRole: UserRole) => {
  const originalUsers = [...users.value] // Clone current state

  // Optimistic update
  users.value = users.value.map(u =>
    u.id === userId ? { ...u, role: newRole } : u
  )

  try {
    await $fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role: newRole }
    })
    toast.success(t('admin.users.roleUpdated'))
  } catch (error) {
    // Rollback to original state (not just previous role)
    users.value = originalUsers
    toast.error(t('admin.users.roleUpdateFailed'))
  }
}
```

### Issue 4: Session Expired During Use

**Symptom**: API calls return 401 after some time

**Solution**: Add session refresh or redirect logic
```typescript
// app/composables/useUsers.ts
const handleApiError = (error: unknown) => {
  if (error instanceof Error && 'statusCode' in error) {
    const statusCode = (error as any).statusCode
    if (statusCode === 401) {
      // Session expired, redirect to login
      navigateTo('/login?redirect=/admin/users')
    }
  }
  toast.error(t('common.errors.generic'))
}
```

## Testing Checklist

**Manual Testing** (all scenarios):
- ✅ View user list with pagination (20 users per page)
- ✅ Filter by role (Admin, Contributor, User)
- ✅ Search by email or name
- ✅ Edit user role (success case)
- ✅ Edit user role (cancel case)
- ✅ Delete user (success case)
- ✅ Delete user (cancel case)
- ✅ Prevent self-deletion (button disabled)
- ✅ Prevent last admin deletion (error message)
- ✅ Non-admin cannot access page (redirect)
- ✅ Keyboard navigation works
- ✅ Screen reader announces correctly
- ✅ Error handling (network failure)
- ✅ Loading states visible
- ✅ Success/error toasts appear

**Code Quality**:
- ✅ TypeScript: `npx nuxi typecheck` passes
- ✅ ESLint: `npx eslint .` passes
- ✅ All translations present (EN + FR)
- ✅ No console errors in browser
- ✅ No accessibility violations (DevTools Inspector)

## Performance Validation

**Load Time** (with 10,000 users in database):
```bash
# Open DevTools Network tab
# Navigate to /admin/users
# Measure:
#   - Time to First Byte (TTFB): < 500ms
#   - Full page load: < 2 seconds (SC-001)
#   - Filter operation: < 1 second (SC-002)
```

**Optimizations Applied**:
- ✅ Server-side pagination (only 20 users fetched)
- ✅ Database indexes on `role` and `createdAt`
- ✅ Optimistic UI updates (instant feedback)
- ✅ Composable caching (don't refetch unless needed)

## Next Steps

After completing this quickstart:

1. **Code Review**:
   - Run `npx nuxi typecheck` and fix any TypeScript errors
   - Run `npx eslint .` and fix any linting errors
   - Test all 5 user stories manually

2. **Documentation**:
   - Add translation keys to `content/i18n/{locale}/admin.yml`
   - Update CHANGELOG.md with new feature entry

3. **Deployment**:
   - Test on staging environment
   - Verify database performance with realistic data
   - Monitor API response times

4. **Future Enhancements** (not in current scope):
   - Audit log for role changes
   - Bulk operations (change multiple roles at once)
   - Export user list to CSV
   - Advanced search (by date range, email domain)
