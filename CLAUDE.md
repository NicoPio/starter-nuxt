# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4 starter template built with Nuxt UI, featuring a modern component-based architecture with TypeScript, Tailwind CSS 4, and multiple Nuxt modules for enhanced functionality.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server (http://localhost:3000)
bun run dev

# Build for production
bun run build

# Preview production build locally
bun run preview

# Generate static site
bun run generate

# Lint code
bun run lint

# Type check
bun run typecheck
```

## Architecture

### Stack

- **Framework**: Nuxt 4 with Vue 3.5
- **UI Library**: Nuxt UI (100+ accessible components with automatic dark mode)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/vite plugin)
- **Content**: Nuxt Content for content management with collections support
- **TypeScript**: Strict typing with project references to .nuxt generated configs
- **Database**: better-sqlite3 included for data persistence

### Key Modules

- `@nuxt/content` - Content management with schema validation
- `@nuxt/ui` - Comprehensive UI component library
- `@nuxt/image` - Image optimization
- `@nuxt/scripts` - Script loading management
- `@nuxt/eslint` - ESLint integration
- `@nuxt/hints` - Development hints
- `@nuxt/test-utils` - Testing utilities
- `nuxt-studio` - Content editing in Nuxt Studio

### Directory Structure

```
app/
├── app.vue           # Root application component
├── app.config.ts     # App-level configuration (currently empty)
├── assets/css/       # Global styles
│   └── main.css      # Tailwind imports + custom theme variables
├── components/       # Auto-imported Vue components
│   ├── AppLogo.vue
│   └── TemplateMenu.vue
└── pages/            # File-based routing
    └── index.vue     # Homepage with UPageHero, UPageSection components

content/              # Content files for Nuxt Content
├── index.yml         # Content data files

public/               # Static assets served at root
```

### Configuration Files

- `nuxt.config.ts` - Main Nuxt configuration with modules and Vite plugins
- `content.config.ts` - Defines content collections (e.g., "authors" collection with name, avatar, url schema)
- `tsconfig.json` - References .nuxt generated TypeScript configs
- `eslint.config.mjs` - Extends .nuxt/eslint.config.mjs for linting

### Content Collections

The project uses Nuxt Content collections with Zod schema validation. Currently defined:

- `authors` collection: data type, sources from `**.yml` files with schema for name, avatar, and url
- if content needs to be added, use nuxt Content to manage the contents

### Styling Approach

- Tailwind CSS 4 with Vite plugin integration
- Custom theme variables defined in `app/assets/css/main.css` using `@theme static`
- Custom green color palette (50-950 shades) for brand colors
- Custom font: 'Public Sans' as the sans-serif family
- Nuxt UI components provide consistent design system

### Component Usage

The template uses Nuxt UI components extensively:

- `UPageHero` - Hero sections with title, description, and action links
- `UPageSection` - Content sections with optional features list
- `UPageCTA` - Call-to-action sections
- All components support Nuxt UI's theming, dark mode, and accessibility features

## Important Notes

- Auto-imports are enabled for components, composables, and utils
- TypeScript configuration relies on Nuxt-generated files in `.nuxt/` directory
- The `postinstall` script runs `nuxt prepare` to generate TypeScript definitions
- Compatibility date set to "2025-07-15"
- Devtools are enabled by default

Reply in french

## Active Technologies
- TypeScript 5.9+ with Nuxt 4.2.1, Vue 3.5, Node.js 18+
- Self-hosted Supabase (PostgreSQL) for database
- nuxt-auth-utils for authentication (email/password + OAuth) - Migrated from Better Auth (005-migrate-nuxt-auth-utils)
- Stripe for payments and subscription management
- Zod for schema validation
- Nuxt Content for i18n and content management
- PostgreSQL (self-hosted Supabase) with custom auth tables (`users`, `oauth_accounts`, `stripe_customers`, `stripe_subscriptions`)
- TypeScript 5.9+, Node.js 18/20 (003-testing-infrastructure)
- Vitest for unit testing, Playwright for E2E testing (003-testing-infrastructure)

## Implementation Notes

### Authentication System (nuxt-auth-utils)
- **Configuration**: `nuxt.config.ts` (session password, OAuth providers in runtimeConfig)
- **Server Utilities**:
  - `server/utils/password.ts` - Password hashing (scrypt) with bcrypt fallback and lazy migration
  - `server/utils/database/users.ts` - User CRUD operations
  - `server/utils/database/oauth.ts` - OAuth account management
  - `server/utils/session.ts` - Session helpers (getUserSession, requireRole)
- **API Routes**:
  - `server/api/auth/login.post.ts` - Email/password login
  - `server/api/auth/register.post.ts` - User registration
  - `server/api/auth/logout.post.ts` - Logout endpoint
  - `server/routes/auth/github.get.ts` - GitHub OAuth
  - `server/routes/auth/google.get.ts` - Google OAuth
  - `server/routes/auth/apple.get.ts` - Apple OAuth
- **Composable**: `app/composables/useAuth.ts` (uses useUserSession from nuxt-auth-utils)
- **Features**:
  - Email/password authentication with scrypt hashing
  - Lazy password migration from bcrypt (Better Auth) to scrypt
  - OAuth providers: GitHub, Google, Apple
  - Session management with secure httpOnly cookies (nuxt-auth-utils)
  - No email verification required
  - Minimum password length: 8 characters

### Role-Based Access Control (RBAC)
- **Roles**: User (default), Contributor, Admin
- **Hierarchy**: User < Contributor < Admin
- **Composable**: `app/composables/useRole.ts`
- **Middlewares**:
  - `app/middleware/admin.ts` - Admin-only routes
  - `app/middleware/contributor.ts` - Contributor+ routes
  - `app/middleware/guest.ts` - Unauthenticated users only
  - `app/middleware/auth.ts` - Authenticated users only
- **Database**: `role` field on `users` table (enum: User, Contributor, Admin)

### Subscription Management (Stripe)
- **Configuration**: Environment variables (see `.env.example`)
- **Composable**: `app/composables/useSubscription.ts`
- **Components**:
  - `app/components/subscription/SubscriptionCard.vue`
  - `app/components/subscription/CancelDialog.vue`
- **API Endpoints**:
  - `POST /api/subscriptions/create` - Create Stripe Checkout session
  - `POST /api/subscriptions/cancel` - Cancel subscription
  - `POST /api/subscriptions/webhook` - Stripe webhook handler
- **Webhook Events**: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### Admin Features
- **User Management** (`app/pages/admin/users.vue`):
  - List users with pagination and search
  - Change user roles (Admin only)
  - Delete users (Admin only)
  - Read-only mode for Contributors
- **Stripe Configuration** (`app/pages/admin/config.vue`):
  - Manage Stripe API keys
  - Toggle test/live mode
  - Environment variable configuration

### Internationalization (i18n)
- **Composable**: `app/composables/useContentI18n.ts`
- **Supported Languages**: English (en), French (fr)
- **Translation Files**: `content/i18n/{locale}/*.yml`
- **Collections**: app, nav, auth, profile, dashboard, subscription, admin, errors, homepage, features, seo, accessibility, error, common
- **Features**:
  - Auto-loads translations from Nuxt Content collections
  - Cookie-based locale persistence
  - Parameter interpolation: `t('key', { param: 'value' })`
  - Fallback to key if translation missing

### UI Components & Styling
- **Framework**: Nuxt UI (NuxtLabs) - 100+ accessible components
- **Theme**: Custom ultra-light theme defined in `app.config.ts` and `app/assets/css/main.css`
- **Colors**:
  - Primary: Blue (`#3b82f6`)
  - Secondary: Violet (`#8b5cf6`)
  - Success: Emerald (`#10b981`)
  - Warning: Amber (`#f59e0b`)
  - Error: Rose (`#f43f5e`)
- **Typography**: Base font size 18px (125% of default), line height 1.6
- **Dark Mode**: Automatic with `ColorModeSwitcher.vue` component

### Error Handling
- **Error Boundary** (`app/components/ErrorBoundary.vue`):
  - Wraps entire app in `app.vue`
  - Catches Vue component errors
  - Shows elegant error UI with retry option
  - Dev mode shows error details
- **Error Pages** (`app/error.vue`):
  - Custom 404 and 500 pages
  - Contextual error messages
  - Quick navigation links
  - Dev mode shows stack traces
- **Form Errors**: All forms have inline validation with Zod schemas

### Accessibility (a11y)
- **Skip Links**: All layouts have "Skip to main content" links
- **ARIA Labels**: All interactive components have proper aria-labels
- **Keyboard Navigation**: Full keyboard support throughout
- **Screen Reader**: Semantic HTML + ARIA attributes
- **Focus Management**: Visible focus indicators
- **Translations**: Dedicated `accessibility.yml` files for screen reader labels

### SEO Optimization
- **Meta Tags**: All public pages have comprehensive meta tags
- **Open Graph**: Full OG tags for social sharing
- **Twitter Cards**: Twitter-specific meta tags
- **Canonical URLs**: Set on all pages
- **Robots**: `noindex, nofollow` on auth pages
- **Configuration**: `nuxt.config.ts` app.head + page-level `useSeoMeta()`

### Form Loading States
- **Pattern**: All forms use `loading` ref + `:loading` and `:disabled` props on UButton
- **Examples**:
  - LoginForm: `loading` + `socialLoading` for OAuth buttons
  - SignupForm: `loading` + `socialLoading`
  - ProfileForm: `loading` from useUser composable
  - StripeConfigForm: `loading` (fetch) + `saving` (submit)

### API Endpoints
- **Auth** (nuxt-auth-utils):
  - `POST /api/auth/login` - Email/password login
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/logout` - Logout
  - `GET /auth/github` - GitHub OAuth callback
  - `GET /auth/google` - Google OAuth callback
  - `GET /auth/apple` - Apple OAuth callback
- **Users**:
  - `GET /api/users/me` - Current user profile
  - `PATCH /api/users/me` - Update user profile
- **Admin**:
  - `GET /api/admin/users` - List users (Admin + Contributor)
  - `GET /api/admin/users/stats` - User statistics
  - `PATCH /api/admin/users/[id]/role` - Change role (Admin only)
  - `DELETE /api/admin/users/[id]` - Delete user (Admin only)
  - `POST /api/admin/promote-first-user` - Promote first user to Admin
  - `GET /api/admin/config/stripe` - Get Stripe config
  - `POST /api/admin/config/stripe` - Update Stripe config
- **Subscriptions**:
  - `GET /api/subscriptions/me` - Get current user subscription
  - `POST /api/subscriptions/cancel` - Cancel subscription
  - `POST /api/subscriptions/webhook` - Stripe webhooks

### Database Schema (Supabase PostgreSQL)
- **Auth Tables** (nuxt-auth-utils custom):
  - `users` - User accounts (id, email, name, password, role, created_at, updated_at)
  - `oauth_accounts` - OAuth provider accounts (id, user_id, provider, provider_user_id, access_token, refresh_token, expires_at)
- **Stripe Tables**:
  - `stripe_customers` - Stripe customer mappings (id, user_id, stripe_customer_id, created_at)
  - `stripe_subscriptions` - Subscription data (id, user_id, stripe_subscription_id, status, price_id, current_period_end, cancel_at_period_end, created_at, updated_at)
- **Migrations**: `supabase/migrations/` directory
- **Connection**: Environment variable `DATABASE_URL`

### Type Safety
- **Shared Types**: `app/types/common.types.ts`
  - UserRole, UserWithRole, Subscription, SubscriptionStatus, etc.
- **Zod Schemas**: Server-side validation for API endpoints
- **Composables**: All composables are fully typed
- **API Responses**: Use explicit return types

### Code Quality
- **ESLint**: Extends Nuxt ESLint config, runs via `npx eslint .`
- **TypeScript**: Strict mode, runs via `npx nuxi typecheck`
- **No Errors**: Project must pass both ESLint and TypeScript checks
- **Conventions**:
  - Use `unknown` instead of `any` for error handling
  - Always check `instanceof Error` before accessing error properties
  - Prefer composables over mixins
  - Use `<script setup>` syntax for all components

### Performance
- **Auto-imports**: Components, composables, and utils are auto-imported
- **Lazy Loading**: Use `defineAsyncComponent` for heavy components
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Use `<NuxtImg>` for all images

### Security Best Practices
- **Environment Variables**: Never commit `.env` file (contains NUXT_SESSION_PASSWORD, OAuth secrets, DATABASE_URL)
- **API Keys**: Store in server-side runtimeConfig only
- **CSRF Protection**: Handled by nuxt-auth-utils sessions (secure httpOnly cookies)
- **SQL Injection**: Use parameterized queries via database adapter
- **XSS Prevention**: Vue automatically escapes output
- **Password Hashing**: scrypt (Node.js crypto) with automatic bcrypt migration
- **Session Management**: nuxt-auth-utils with encrypted cookies and configurable maxAge

## Development Workflow
1. Install dependencies: `bun install`
2. Generate session password: `openssl rand -base64 32` and add to `.env` as `NUXT_SESSION_PASSWORD`
3. Configure OAuth providers (optional): Add client IDs and secrets to `.env` (see `.env.example`)
4. Start Supabase: `supabase start`
5. Run migrations: `supabase db push`
6. Start dev server: `bun run dev`
7. Check types: `bun run typecheck`
8. Lint code: `bun run lint`
9. Run tests: `bun run test:unit` or `bun run test:e2e`
10. Build for production: `bun run build`

## Recent Changes
- **005-migrate-nuxt-auth-utils**: 🚀 Migrated from Better Auth to nuxt-auth-utils
  - Replaced Better Auth with nuxt-auth-utils for session management
  - Custom email/password authentication with scrypt hashing
  - Lazy password migration from bcrypt to scrypt
  - OAuth support: GitHub, Google, Apple
  - New database tables: `users`, `oauth_accounts`
  - Better Auth tables removed: `user`, `session`, `account`, `verification`, `password`
  - All tests passing, production-ready
- **004-stripe-subscription-management**: Added Stripe integration for subscriptions
  - Stripe customer and subscription management
  - Webhook handling for subscription events
  - Admin configuration for Stripe API keys
- **003-testing-infrastructure**: Added Vitest (unit) and Playwright (E2E) testing
  - Unit tests for composables and utilities
  - E2E tests for critical user flows
  - Code coverage reporting
