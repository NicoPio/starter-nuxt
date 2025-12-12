# Nuxt Starter with nuxt-auth-utils

A production-ready Nuxt 4 starter template with authentication, role-based access control, Stripe subscriptions, and comprehensive testing.

## Features

- 🔐 **Authentication**: Email/password + OAuth (GitHub, Google, Apple) using nuxt-auth-utils
- 👥 **Role-Based Access Control**: User, Contributor, and Admin roles
- 💳 **Stripe Integration**: Subscription management with webhooks
- 🌍 **Internationalization**: English and French support with Nuxt Content
- 🎨 **UI Components**: 100+ accessible components with Nuxt UI
- 🌙 **Dark Mode**: Automatic theme switching
- ✅ **Testing**: Unit tests (Vitest) and E2E tests (Playwright)
- 🗄️ **Database**: Self-hosted Supabase (PostgreSQL)
- 📝 **Type Safety**: Full TypeScript support

## Prerequisites

- Node.js 18+ or 20+
- Bun (recommended) or npm/pnpm/yarn
- Docker (for Supabase)

## Quick Start

### 1. Install Dependencies

```bash
# bun (recommended)
bun install

# npm
npm install

# pnpm
pnpm install

# yarn
yarn install
```

### 2. Environment Setup

Generate a session password:

```bash
openssl rand -base64 32
```

Create a `.env` file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Session password (required)
NUXT_SESSION_PASSWORD=your_generated_session_password

# Database URL (Supabase)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# OAuth Providers (optional)
NUXT_OAUTH_GITHUB_CLIENT_ID=your_github_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret

NUXT_OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret

NUXT_OAUTH_APPLE_CLIENT_ID=your_apple_client_id
NUXT_OAUTH_APPLE_CLIENT_SECRET=your_apple_client_secret

# Stripe (optional)
NUXT_STRIPE_SECRET_KEY=your_stripe_secret_key
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NUXT_STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 3. Start Supabase

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Initialize Supabase (if not already done)
supabase init

# Start Supabase services
supabase start

# Apply migrations
supabase db push
```

### 4. Run Development Server

Start the development server on `http://localhost:3000`:

```bash
# bun (recommended)
bun run dev

# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev
```

## Authentication

### Email/Password Authentication

The application uses nuxt-auth-utils for session management with secure password hashing (scrypt).

**Features:**
- Email/password signup and login
- Automatic password migration from bcrypt (Better Auth legacy)
- Minimum password length: 8 characters
- No email verification required

### OAuth Authentication

Supports three OAuth providers:
- **GitHub**: User profile and email access
- **Google**: Email and profile information
- **Apple**: Sign in with Apple ID

**Setup OAuth Providers:**

1. **GitHub OAuth**:
   - Create OAuth App: https://github.com/settings/developers
   - Set callback URL: `http://localhost:3000/auth/github`
   - Add Client ID and Secret to `.env`

2. **Google OAuth**:
   - Create OAuth credentials: https://console.cloud.google.com/apis/credentials
   - Set authorized redirect URI: `http://localhost:3000/auth/google`
   - Add Client ID and Secret to `.env`

3. **Apple OAuth**:
   - Configure Sign in with Apple: https://developer.apple.com
   - Set return URL: `http://localhost:3000/auth/apple`
   - Add Client ID and Secret to `.env`

### Role-Based Access Control

Three user roles with hierarchical permissions:
- **User** (default): Basic access to dashboard and profile
- **Contributor**: User permissions + read-only access to admin panel
- **Admin**: Full access including user management and configuration

**Protect Routes:**

```typescript
// app/middleware/admin.ts
export default defineNuxtRouteMiddleware(async () => {
  const { user } = useUserSession()
  if (!user.value || user.value.role !== 'Admin') {
    return navigateTo('/dashboard')
  }
})
```

## Testing

### Unit Tests

Run unit tests with Vitest:

```bash
bun run test:unit

# With coverage
bun run test:coverage
```

### E2E Tests

Run end-to-end tests with Playwright:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
bun run test:e2e

# Run in UI mode
bun run test:e2e:ui
```

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
bun run lint
```

## Stripe Integration

### Setup Stripe

1. Create a Stripe account: https://dashboard.stripe.com/register
2. Get your API keys from: https://dashboard.stripe.com/test/apikeys
3. Add keys to `.env` file
4. Configure webhook endpoint: `http://localhost:3000/api/subscriptions/webhook`
5. Update webhook secret in `.env`

### Subscription Management

Users can:
- Subscribe to plans via Stripe Checkout
- View subscription status on dashboard
- Cancel subscriptions (ends at period end)
- Manage payment methods

Admins can:
- Configure Stripe API keys
- Toggle test/live mode
- View subscription statistics

## Database Schema

### Authentication Tables

- **users**: User accounts (id, email, name, password, role, created_at, updated_at)
- **oauth_accounts**: OAuth provider accounts (id, user_id, provider, provider_user_id, tokens)

### Stripe Tables

- **stripe_customers**: Stripe customer mappings (id, user_id, stripe_customer_id)
- **stripe_subscriptions**: Subscription data (id, user_id, subscription_id, status, price_id)

### Migrations

Migrations are stored in `supabase/migrations/` and applied via:

```bash
supabase db push
```

## Production Deployment

### Build for Production

```bash
# bun (recommended)
bun run build

# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build
```

### Preview Production Build

```bash
# bun (recommended)
bun run preview

# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview
```

### Environment Variables

Ensure all production environment variables are set:
- Use strong `NUXT_SESSION_PASSWORD` (min 32 characters)
- Use production database URL
- Use live Stripe keys
- Configure production OAuth callback URLs

### Database Migration

Before deploying:
1. Backup production database
2. Test migrations on staging environment
3. Apply migrations: `supabase db push`
4. Verify data integrity

## Project Structure

```
app/
├── components/       # Vue components
├── composables/      # Reusable composition functions
├── middleware/       # Route middleware (auth, admin, guest)
├── pages/            # File-based routing
├── types/            # TypeScript type definitions
└── utils/            # Utility functions

server/
├── api/              # API endpoints
├── middleware/       # Server middleware
├── routes/           # OAuth callback routes
└── utils/            # Server utilities
  ├── database/       # Database operations
  ├── password.ts     # Password hashing utilities
  └── session.ts      # Session management

test/
├── e2e/              # Playwright E2E tests
├── nuxt/             # Nuxt component/composable tests
└── unit/             # Unit tests

supabase/
└── migrations/       # Database migrations

content/
└── i18n/             # Internationalization files
  ├── en/             # English translations
  └── fr/             # French translations
```

## Documentation

- [Nuxt Documentation](https://nuxt.com/docs)
- [nuxt-auth-utils Documentation](https://github.com/Atinux/nuxt-auth-utils)
- [Nuxt UI Documentation](https://ui.nuxt.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Playwright Documentation](https://playwright.dev)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
