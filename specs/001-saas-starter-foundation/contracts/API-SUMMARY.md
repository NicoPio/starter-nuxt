# API Contracts Summary

**Feature**: SaaS Starter Foundation
**Base URL**: `/api`
**Date**: 2025-11-25

## Authentication Endpoints

### POST `/api/auth/signup`
**Purpose**: Create new user account
**Auth**: None
**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe" // optional
}
```
**Response 201**:
```json
{
  "user": { "id": "uuid", "email": "...", "role": "User" },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

### POST `/api/auth/login`
**Auth**: None
**Body**: `{ "email": "...", "password": "..." }`
**Response 200**: Same as signup

### POST `/api/auth/logout`
**Auth**: Required
**Response 204**: No content

---

## User Profile Endpoints

### GET `/api/users/me`
**Auth**: Required
**Response 200**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "User",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "created_at": "2025-11-25T10:00:00Z"
}
```

### PATCH `/api/users/me`
**Auth**: Required
**Body**: `{ "full_name": "New Name", "avatar_url": "https://..." }`
**Response 200**: Updated profile object

---

## Admin User Management

### GET `/api/admin/users`
**Auth**: Admin or Contributor
**Query Params**: `?page=1&limit=20&search=email&role=User`
**Response 200**:
```json
{
  "users": [{...profile objects...}],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### PATCH `/api/admin/users/[id]/role`
**Auth**: Admin only
**Body**: `{ "role": "Contributor" }`
**Response 200**: Updated profile

### DELETE `/api/admin/users/[id]`
**Auth**: Admin only
**Response 204**: No content

---

## Subscription Endpoints

### GET `/api/subscriptions/me`
**Auth**: Required
**Response 200**:
```json
{
  "id": "uuid",
  "plan_type": "pro",
  "status": "active",
  "current_period_end": "2026-01-25T10:00:00Z",
  "cancel_at": null
}
```

### POST `/api/subscriptions/cancel`
**Auth**: Required
**Body**: `{ "confirm": true }`
**Response 200**:
```json
{
  "subscription": {...},
  "cancel_at": "2026-01-25T10:00:00Z"
}
```

### POST `/api/subscriptions/webhook`
**Auth**: Stripe signature verification
**Body**: Stripe webhook payload
**Response 200**: `{ "received": true }`
**Purpose**: Handle Stripe subscription events (created, updated, deleted, payment_failed)

---

## Admin Configuration

### GET `/api/admin/config/stripe`
**Auth**: Admin only
**Response 200**:
```json
{
  "stripe_public_key": "pk_test_...",
  "is_test_mode": true,
  "configured": true
}
```

### POST `/api/admin/config/stripe`
**Auth**: Admin only
**Body**:
```json
{
  "stripe_public_key": "pk_...",
  "stripe_secret_key": "sk_...",
  "webhook_secret": "whsec_...",
  "is_test_mode": true
}
```
**Response 200**: Config status

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {}
  }
}
```

**Error Codes**:
- `UNAUTHORIZED` (401): Not authenticated
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input
- `SERVER_ERROR` (500): Internal error

---

## Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates with Supabase
3. Supabase returns JWT access token
4. Client stores token in cookie/localStorage
5. Subsequent requests include token in Authorization header or cookie
6. Server validates token with Supabase on each request

---

## Role-Based Access Matrix

| Endpoint | User | Contributor | Admin |
|----------|------|-------------|-------|
| POST /auth/* | ✅ | ✅ | ✅ |
| GET /users/me | ✅ | ✅ | ✅ |
| PATCH /users/me | ✅ | ✅ | ✅ |
| GET /subscriptions/me | ✅ | ✅ | ✅ |
| POST /subscriptions/cancel | ✅ | ✅ | ✅ |
| GET /admin/users | ❌ | ✅ (read-only) | ✅ |
| PATCH /admin/users/*/role | ❌ | ❌ | ✅ |
| DELETE /admin/users/* | ❌ | ❌ | ✅ |
| GET /admin/config/* | ❌ | ❌ | ✅ |
| POST /admin/config/* | ❌ | ❌ | ✅ |

---

**Implementation Notes**:
- Use Nuxt server routes: `server/api/[path].{get|post|patch|delete}.ts`
- Validate requests with Zod schemas
- Use Supabase RLS as defense-in-depth
- Return toast-friendly error messages
- Log all admin actions for audit trail

**Status**: ✅ API contracts defined, ready for implementation
