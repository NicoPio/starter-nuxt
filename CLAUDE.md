# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4 starter template built with Nuxt UI, featuring a modern component-based architecture with TypeScript, Tailwind CSS 4, and multiple Nuxt modules for enhanced functionality.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Generate static site
npm run generate

# Lint code
npx eslint .
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
- Better Auth v1.4.2 for authentication (email/password + OAuth)
- Stripe for payments and subscription management
- Zod for schema validation
- Nuxt Content for i18n and content management
- PostgreSQL (self-hosted Supabase) with Better Auth tables (`user`, `session`, `account`, `verification`) (002-admin-user-management)

## Implementation Notes

### Authentication System (Better Auth)
- **Configuration**: `server/utils/auth.ts`
- **Client**: `lib/auth-client.ts`
- **Composable**: `app/composables/useAuth.ts`
- **Features**:
  - Email/password authentication with auto sign-in after signup
  - OAuth providers: GitHub, Google, Apple
  - Session management with httpOnly cookies
  - No email verification required (configurable)
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
- **Database**: `role` field on Better Auth `user` table

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
- **Auth**: Handled by Better Auth automatically (`/api/auth/*`)
- **Users**:
  - `GET /api/users/me` - Current user profile
- **Admin**:
  - `GET /api/admin/users` - List users (Admin + Contributor)
  - `PATCH /api/admin/users/[id]/role` - Change role (Admin only)
  - `DELETE /api/admin/users/[id]` - Delete user (Admin only)
  - `POST /api/admin/promote-first-user` - Promote first user to Admin
  - `GET /api/admin/config/stripe` - Get Stripe config
  - `POST /api/admin/config/stripe` - Update Stripe config
- **Subscriptions**:
  - `POST /api/subscriptions/create` - Create Checkout session
  - `POST /api/subscriptions/cancel` - Cancel subscription
  - `POST /api/subscriptions/webhook` - Stripe webhooks

### Database Schema (Supabase PostgreSQL)
- **Better Auth Tables**: `user`, `session`, `account`, `verification`
- **Custom Fields**: `role` added to `user` table via Better Auth `additionalFields`
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
- **Environment Variables**: Never commit `.env` file
- **API Keys**: Store in server-side runtimeConfig only
- **CORS**: Configured in Better Auth
- **CSRF Protection**: Handled by Better Auth sessions
- **SQL Injection**: Use parameterized queries via database adapter
- **XSS Prevention**: Vue automatically escapes output
- **Password Hashing**: Handled by Better Auth (bcrypt)

## Development Workflow
1. Install dependencies: `npm install`
2. Start Supabase: `supabase start`
3. Run migrations: `supabase db push`
4. Start dev server: `npm run dev`
5. Check types: `npx nuxi typecheck`
6. Lint code: `npx eslint .`
7. Build for production: `npm run build`

## Recent Changes
- 002-admin-user-management: Added TypeScript 5.9+ with Nuxt 4.2.1, Vue 3.5, Node.js 18+
- 001-saas-starter-foundation: Added TypeScript 5.9+ with Nuxt 4.2.1, Vue 3.5, Node.js 18+
- Always add a new entry to @CHANGELOG.md when a new feature is added
  - Blocs <script> ou <script setup>
  - Fichiers .js / .ts / .mjs
  - JAMAIS directement dans les expressions de template Vue (v-if, {{ }}, etc.)
