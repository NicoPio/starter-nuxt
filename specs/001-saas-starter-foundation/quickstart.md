# Quickstart Guide: SaaS Starter Foundation

**Feature**: 001-saas-starter-foundation
**Last Updated**: 2025-11-25

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for self-hosted Supabase)
- Stripe account (test mode)
- Git

---

## 1. Install Dependencies

```bash
npm install

# Add new dependencies for this feature
npm install @nuxtjs/supabase @nuxtjs/i18n stripe zod
npm install -D @types/stripe
```

---

## 2. Setup Self-Hosted Supabase

```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy example environment file
cp .env.example .env

# Generate secrets for JWT
#   Generate two different secure random strings for:
#   - JWT_SECRET (used for signing tokens)
#   - ANON_KEY and SERVICE_ROLE_KEY (generated from JWT_SECRET)

# Start Supabase
docker-compose up -d

# Wait for services to start (30-60 seconds)
# Access Supabase Studio at http://localhost:54323
```

**Important URLs**:
- Supabase Studio: `http://localhost:54323`
- Supabase API: `http://localhost:54321`
- PostgreSQL: `localhost:54322`

---

## 3. Run Database Migrations

```bash
# In Supabase Studio (http://localhost:54323):
# 1. Go to SQL Editor
# 2. Copy content from specs/001-saas-starter-foundation/data-model.md
# 3. Run the SQL migration
# 4. Verify tables created: profiles, subscriptions, payment_config

# Or use Supabase CLI:
npx supabase db reset  # Reset and apply all migrations
```

---

## 4. Configure Environment Variables

Create `.env` file in project root:

```bash
# Supabase (self-hosted)
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-anon-key-from-supabase-dashboard
SUPABASE_SERVICE_KEY=your-service-role-key

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe CLI or dashboard

# App
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Get Supabase Keys**:
1. Open Supabase Studio: http://localhost:54323
2. Go to Settings → API
3. Copy "anon" key → `SUPABASE_KEY`
4. Copy "service_role" key → `SUPABASE_SERVICE_KEY`

---

## 5. Update Nuxt Configuration

Add to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    '@nuxt/ui',
    '@nuxtjs/supabase',  // Add
    '@nuxtjs/i18n',      // Add
    // ... other modules
  ],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/signup']
    }
  },

  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'fr', file: 'fr.json' }
    ],
    defaultLocale: 'en',
    lazy: true,
    langDir: 'locales/'
  }
})
```

---

## 6. Create First Admin User

```bash
# 1. Start dev server
npm run dev

# 2. Go to http://localhost:3000/signup
# 3. Register with your email

# 4. In Supabase Studio SQL Editor, run:
UPDATE public.profiles
SET role = 'Admin'
WHERE email = 'your-email@example.com';
```

---

## 7. Configure Stripe Webhooks (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/subscriptions/webhook

# Copy the webhook signing secret (starts with whsec_)
# Add to .env as STRIPE_WEBHOOK_SECRET
```

---

## 8. Verify Setup

### Test Checklist:

```bash
# 1. Supabase running
curl http://localhost:54321/rest/v1/

# 2. App running
npm run dev
# Visit http://localhost:3000

# 3. Database tables exist
# In Supabase Studio → Table Editor:
#   - profiles ✓
#   - subscriptions ✓
#   - payment_config ✓

# 4. Can sign up
# Visit http://localhost:3000/signup

# 5. Admin role works
# Login with admin account
# Visit http://localhost:3000/admin/users
```

---

## 9. Project Structure Overview

```
starter-nuxt/
├── app/
│   ├── components/      # Vue components (auto-imported)
│   ├── composables/     # useAuth, useUser, etc.
│   ├── layouts/         # default, dashboard, admin
│   ├── middleware/      # auth, role checks
│   ├── pages/           # File-based routing
│   └── plugins/         # Supabase, Stripe clients
├── server/
│   ├── api/            # API routes
│   ├── middleware/     # Server middleware
│   └── utils/          # Supabase/Stripe server clients
├── supabase/
│   ├── config.toml     # Supabase config
│   └── migrations/     # SQL migrations
├── locales/            # i18n translations
│   ├── en.json
│   └── fr.json
└── specs/001-saas-starter-foundation/
    ├── plan.md         # Implementation plan
    ├── data-model.md   # Database schema
    └── contracts/      # API contracts
```

---

## 10. Development Workflow

```bash
# Start services
docker-compose -f supabase/docker/docker-compose.yml up -d
npm run dev

# Run tests
npm run test

# Lint code
npx eslint .

# Type check
npx nuxi typecheck

# Build for production
npm run build
npm run preview
```

---

## Troubleshooting

### Supabase Connection Errors
```bash
# Check if Supabase is running
docker ps | grep supabase

# Restart Supabase
cd supabase/docker
docker-compose restart
```

### Database Migration Fails
```bash
# Reset database
npx supabase db reset

# Or manually drop and recreate tables
```

### Stripe Webhook Not Receiving Events
```bash
# Ensure Stripe CLI is running
stripe listen --forward-to localhost:3000/api/subscriptions/webhook

# Check webhook secret matches .env
```

---

## Next Steps

After setup complete:

1. ✅ Read `plan.md` for full implementation details
2. ✅ Review `data-model.md` for database schema
3. ✅ Check `contracts/API-SUMMARY.md` for API endpoints
4. ✅ Run `/speckit.tasks` to generate implementation tasks
5. ✅ Start implementing with `/speckit.implement`

---

**Setup Complete!** 🎉

Your SaaS starter foundation is ready for development.
