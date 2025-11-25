# Technology Research & Decisions

**Feature**: SaaS Starter Foundation
**Date**: 2025-11-25

## Key Technology Decisions

### 1. Authentication & Database: Supabase (Self-Hosted)

**Decision**: Use self-hosted Supabase for authentication and PostgreSQL database

**Rationale**:
- Full control over data (self-hosted requirement)
- Built-in auth with JWT tokens, email confirmation, password reset
- PostgreSQL with Row Level Security (RLS) for fine-grained access control
- Real-time subscriptions if needed later
- TypeScript SDK with excellent Nuxt integration

**Alternatives Considered**:
- **Auth0 + PostgreSQL**: More complex setup, requires paid plans for features
- **Custom auth + Prisma**: More work, need to implement auth flows from scratch
- **Firebase**: Not self-hostable, vendor lock-in

**Implementation Notes**:
- Use `@nuxtjs/supabase` module for seamless integration
- Implement RLS policies for role-based access
- Server-side client for API routes, client-side for browser

---

### 2. Payment Processing: Stripe

**Decision**: Stripe for subscription management and payment processing

**Rationale**:
- Industry standard for SaaS subscriptions
- Comprehensive API for subscriptions, invoices, webhooks
- Test mode for development
- Excellent documentation and TypeScript support
- PCI compliance handled by Stripe

**Alternatives Considered**:
- **PayPal**: Less developer-friendly API, fewer features for subscriptions
- **Paddle**: Merchant of record model, less flexible for custom flows
- **LemonSqueezy**: Newer, smaller ecosystem

**Implementation Notes**:
- Use Stripe Checkout for payment flow
- Webhooks for subscription status updates (cancel, renew, payment failed)
- Store Stripe Customer ID and Subscription ID in Supabase
- Server-side only for API key security

---

### 3. Internationalization: @nuxtjs/i18n

**Decision**: Official Nuxt i18n module for multi-language support

**Rationale**:
- Official Nuxt module with SSR support
- Vue I18n under the hood (mature, well-tested)
- Automatic route localization
- Language detection from browser/cookie
- SEO-friendly with hreflang tags

**Alternatives Considered**:
- **Custom solution**: Too much work for common requirements
- **vue-i18n directly**: Nuxt module provides better DX and SSR handling

**Implementation Notes**:
- Start with English and French
- JSON files in `/locales/` directory
- Lazy-load translations for performance
- Use `$t()` in templates, `t()` in composables

---

### 4. UI Components: Nuxt UI Pro

**Decision**: Continue using Nuxt UI (already installed v4.2.1)

**Rationale**:
- Already in project, 100+ accessible components
- Built-in toast notifications (UNotifications)
- Dark mode support out of the box
- Tailwind CSS integration
- Form components with validation
- WCAG 2.1 AA compliant

**Implementation Notes**:
- Use UForm for all forms with Zod validation
- UToast for success/error notifications
- UTable for admin user list
- UButton, UInput, UCard for consistent UI

---

### 5. Role-Based Access Control (RBAC)

**Decision**: Middleware-based RBAC with Supabase RLS

**Rationale**:
- Nuxt middleware for route protection (client-side)
- Supabase RLS for database-level security (server-side)
- Triple layer: UI (hide elements), Routing (redirect), Database (enforce)

**Implementation**:
```typescript
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo('/login')
})

// app/middleware/admin.ts
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  if (user.value?.role !== 'Admin') return navigateTo('/dashboard')
})
```

**RLS Policies**:
- Users can read their own data
- Admins can read/write all users
- Contributors can read all users (for support)
- Role changes only by Admins

---

### 6. State Management

**Decision**: Composables only (no Pinia/Vuex)

**Rationale**:
- Nuxt 3/4 auto-imports composables
- Simpler than store boilerplate
- Sufficient for this app scope
- useState for shared state

**Implementation**:
```typescript
// app/composables/useAuth.ts
export const useAuth = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const signOut = async () => {
    await client.auth.signOut()
    navigateTo('/login')
  }

  return { user, signOut }
}
```

---

## Environment Variables

Required environment variables:

```bash
# Supabase (self-hosted)
SUPABASE_URL=https://your-supabase-instance.com
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@nuxtjs/supabase": "^1.4.0",
    "@nuxtjs/i18n": "^8.9.0",
    "stripe": "^17.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/stripe": "^8.0.417"
  }
}
```

---

## Best Practices Applied

1. **Security**:
   - Never expose Supabase service key or Stripe secret key to client
   - Use RLS policies as defense-in-depth
   - Validate all inputs with Zod
   - HTTPS only in production

2. **Performance**:
   - Server-side render public pages (SEO + speed)
   - Client-side navigation for authenticated pages
   - Lazy-load translations
   - Optimize images with @nuxt/image

3. **Developer Experience**:
   - TypeScript strict mode
   - ESLint for code quality
   - Auto-imports for composables and components
   - Hot reload for fast development

4. **Accessibility**:
   - Semantic HTML
   - ARIA labels where needed
   - Keyboard navigation
   - Screen reader tested (Nuxt UI handles this)

---

**Status**: ✅ All technology decisions finalized, ready for Phase 1 (Data Model & Contracts)
