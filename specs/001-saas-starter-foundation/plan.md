# Implementation Plan: SaaS Starter Foundation

**Branch**: `001-saas-starter-foundation` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-saas-starter-foundation/spec.md`

## Summary

Build a production-ready SaaS starter with user management (Admin/Contributor/User roles), authentication, profile management, subscription handling via Stripe, admin dashboard, and public/restricted content areas. The foundation leverages Nuxt 4, Nuxt UI Pro, Nuxt Content, Tailwind CSS, i18n for multi-language support, and self-hosted Supabase for authentication and database.

**Technical Approach**: Full-stack Nuxt 4 application with server routes for API, Supabase for auth/database, Nuxt Content for CMS, Stripe SDK for payments, and Nuxt UI Pro components for consistent UX with toast notifications.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Nuxt 4.2.1, Vue 3.5, Node.js 18+
**Primary Dependencies**:
- Frontend: Nuxt UI Pro (v4.2.1), Tailwind CSS (v4.1.17), @nuxtjs/i18n
- Backend: Supabase JS Client, Stripe Node SDK
- Content: Nuxt Content (v3.8.2) with Zod validation
**Storage**: Self-hosted Supabase (PostgreSQL) for users, roles, subscriptions, and auth
**Testing**: Vitest for unit/integration, @nuxt/test-utils for component testing
**Target Platform**: Universal (SSR/SSG) - Deploy to Vercel, Netlify, or self-hosted Node server
**Project Type**: Web application (frontend + backend API routes)
**Performance Goals**: <200ms page load (P95), <100ms API responses, 60fps animations
**Constraints**:
- Supabase self-hosted (no cloud dependencies)
- Stripe in test mode initially with webhook configuration
- Multi-language (i18n) from day one
- Accessibility WCAG 2.1 AA compliance via Nuxt UI
**Scale/Scope**:
- 100-1000 users MVP
- 3 user roles (Admin/Contributor/User)
- 10-20 pages (public landing, auth flows, dashboards, profile, subscriptions, admin)
- Stripe integration for subscriptions

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Status**: N/A - No constitution file defined yet. Standard Nuxt/Vue best practices apply.

**Best Practices Applied**:
- Component-based architecture with Nuxt auto-imports
- Type-safe with TypeScript and Zod schemas
- Server-side rendering for SEO
- Progressive enhancement
- Accessibility-first with Nuxt UI
- Environment-based configuration

## Project Structure

### Documentation (this feature)

```text
specs/001-saas-starter-foundation/
├── plan.md              # This file (/speckit.plan)
├── research.md          # Phase 0 output - Technology decisions
├── data-model.md        # Phase 1 output - Database schema
├── quickstart.md        # Phase 1 output - Setup guide
├── contracts/           # Phase 1 output - API specifications
│   ├── auth.yaml        # Authentication endpoints
│   ├── users.yaml       # User management endpoints
│   ├── subscriptions.yaml  # Subscription management
│   └── admin.yaml       # Admin operations
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```text
# Nuxt 4 Full-Stack Application Structure

app/                         # Application code (Nuxt 4 convention)
├── assets/
│   └── css/
│       └── main.css        # Global styles + Tailwind
├── components/             # Auto-imported Vue components
│   ├── auth/              # Authentication components
│   ├── admin/             # Admin dashboard components
│   ├── profile/           # Profile management
│   ├── subscription/      # Subscription UI
│   └── ui/                # Shared UI components
├── composables/           # Auto-imported composables
│   ├── useAuth.ts        # Authentication state
│   ├── useUser.ts        # User management
│   ├── useSubscription.ts # Subscription state
│   └── useToast.ts       # Toast notifications
├── layouts/              # Layout components
│   ├── default.vue      # Public layout
│   ├── dashboard.vue    # Authenticated layout
│   └── admin.vue        # Admin layout
├── middleware/          # Route middleware
│   ├── auth.ts         # Authentication check
│   ├── role.ts         # Role-based access control
│   └── guest.ts        # Redirect authenticated users
├── pages/              # File-based routing
│   ├── index.vue      # Landing page
│   ├── login.vue      # Login page
│   ├── signup.vue     # Registration page
│   ├── dashboard.vue  # User dashboard
│   ├── profile.vue    # Profile management
│   ├── subscription.vue # Subscription management
│   └── admin/
│       ├── index.vue  # Admin dashboard
│       ├── users.vue  # User management
│       └── config.vue # Stripe configuration
├── plugins/           # Nuxt plugins
│   ├── supabase.ts   # Supabase client
│   └── stripe.ts     # Stripe client (client-side)
└── utils/            # Utility functions
    ├── validators.ts # Form validation helpers
    └── formatters.ts # Data formatting

server/                # Server-side code (Nuxt 4 server directory)
├── api/              # API routes
│   ├── auth/
│   │   ├── login.post.ts
│   │   ├── signup.post.ts
│   │   └── logout.post.ts
│   ├── users/
│   │   ├── [id].get.ts
│   │   ├── [id].patch.ts
│   │   └── [id].delete.ts
│   ├── admin/
│   │   ├── users.get.ts
│   │   ├── users/[id]/role.patch.ts
│   │   └── config/stripe.post.ts
│   └── subscriptions/
│       ├── index.get.ts
│       ├── cancel.post.ts
│       └── webhook.post.ts
├── middleware/      # Server middleware
│   └── auth.ts     # Session validation
└── utils/          # Server utilities
    ├── supabase.ts # Supabase server client
    └── stripe.ts   # Stripe server SDK

content/            # Nuxt Content files
├── pages/         # Page content (landing, features, etc.)
└── config/        # Configuration data

public/            # Static assets
├── favicon.ico
└── robots.txt

tests/             # Test suite
├── unit/         # Unit tests (composables, utils)
├── integration/  # Integration tests (API routes)
└── e2e/          # End-to-end tests (full user flows)

supabase/         # Supabase configuration (self-hosted)
├── config.toml   # Supabase settings
├── migrations/   # Database migrations
│   └── 001_initial_schema.sql
└── seed.sql      # Initial data (admin user, etc.)

locales/          # i18n translations
├── en.json      # English
├── fr.json      # French
└── ...

# Configuration files (root)
nuxt.config.ts           # Nuxt configuration
content.config.ts        # Nuxt Content collections
tsconfig.json           # TypeScript config
tailwind.config.ts      # Tailwind config (optional overrides)
.env                    # Environment variables (not committed)
.env.example            # Example environment variables
```

**Structure Decision**: Full-stack Nuxt 4 application using the `app/` directory for frontend code and `server/` directory for API routes. This leverages Nuxt's hybrid rendering capabilities and allows for both SSR/SSG for public pages and API routes for authenticated operations. Supabase provides the database and authentication layer, while Stripe handles subscription payments.

## Complexity Tracking

> **No violations - constitution not defined yet**

Standard Nuxt 4 architecture with minimal complexity:
- Single monorepo structure (simpler than microservices)
- Leveraging framework conventions (auto-imports, file-based routing)
- Using battle-tested libraries (Supabase, Stripe, Nuxt UI)
- Type safety via TypeScript + Zod schemas
