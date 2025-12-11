# Quickstart Guide: Stripe Subscription Management

**Feature**: 004-stripe-subscription-management
**Audience**: Developers implementing the Stripe integration
**Estimated Time**: 30 minutes

## Prerequisites

Before starting, ensure you have:

- ✅ Nuxt 4.2.1+ application running
- ✅ Better Auth configured and working
- ✅ Supabase PostgreSQL database connected
- ✅ Node.js 18+ installed
- ✅ Stripe account created ([stripe.com](https://stripe.com))
- ✅ Stripe CLI installed (optional but recommended)

## Step 1: Install Dependencies

```bash
# Install Stripe Node.js SDK
bun add stripe

# Types are included in the package
```

## Step 2: Configure Environment Variables

Create or update your `.env` file:

```bash
# Existing variables...
DATABASE_URL=postgres://user:password@localhost:5432/dbname
BETTER_AUTH_SECRET=your-secret-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# New Stripe variables
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXX

# Encryption key for API keys storage (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
STRIPE_ENCRYPTION_KEY=a1b2c3d4e5f6...64_hex_chars_total
```

### Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. For webhook secret, see Step 5

## Step 3: Run Database Migrations

```bash
# Create migration file
supabase migration new stripe_subscriptions

# Copy the SQL from data-model.md to:
# supabase/migrations/[timestamp]_stripe_subscriptions.sql

# Apply migrations
supabase db push

# Verify tables created
supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'stripe%' OR table_name LIKE '%subscription%';"
```

Expected output:
```
stripe_configuration
subscription_plans
user_subscriptions
payment_history
webhook_logs
```

## Step 4: Update Nuxt Configuration

Update `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  // ... existing config

  runtimeConfig: {
    // ... existing runtimeConfig

    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      encryptionKey: process.env.STRIPE_ENCRYPTION_KEY,
    },
  },
})
```

## Step 5: Setup Stripe CLI (for local webhook testing)

### Install Stripe CLI

**macOS**:
```bash
brew install stripe/stripe-cli/stripe
```

**Linux**:
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Windows**:
```bash
scoop install stripe
```

### Login to Stripe

```bash
stripe login
```

This will open your browser to authorize the CLI.

### Forward Webhooks to Localhost

```bash
# Start your Nuxt app first
bun run dev

# In a new terminal, forward webhooks
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef (^C to quit)
```

Copy this `whsec_...` value to your `.env` as `STRIPE_WEBHOOK_SECRET`.

## Step 6: Create Your First Subscription Plan in Stripe

### Option A: Via Stripe Dashboard (Recommended for first test)

1. Go to [Stripe Products](https://dashboard.stripe.com/test/products)
2. Click **"Add product"**
3. Fill in:
   - **Name**: Pro Plan
   - **Description**: Professional plan for power users
   - **Pricing model**: Standard pricing
   - **Price**: 29.00 EUR
   - **Billing period**: Monthly
4. Click **"Save product"**
5. Copy the **Product ID** (starts with `prod_`) and **Price ID** (starts with `price_`)

### Option B: Via Stripe CLI

```bash
# Create a product
stripe products create \
  --name="Pro Plan" \
  --description="Professional plan for power users"

# Output: prod_ABC123

# Create a price for the product
stripe prices create \
  --product=prod_ABC123 \
  --unit-amount=2900 \
  --currency=eur \
  --recurring[interval]=month

# Output: price_XYZ789
```

### Option C: Programmatically (after implementing server utils)

```typescript
// server/utils/stripe/products.ts
const stripe = getStripeClient()

const product = await stripe.products.create({
  name: 'Pro Plan',
  description: 'Professional plan for power users',
})

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2900, // 29.00 EUR
  currency: 'eur',
  recurring: { interval: 'month' },
})

console.log({ product_id: product.id, price_id: price.id })
```

## Step 7: Insert Plan in Database

Once you have your Stripe Product and Price IDs:

```sql
-- Via supabase db execute or directly in Supabase Studio

INSERT INTO subscription_plans (
  name,
  description,
  stripe_product_id,
  stripe_price_id,
  amount,
  currency,
  interval,
  features,
  active,
  display_order
) VALUES (
  'Pro',
  'Professional plan for power users',
  'prod_ABC123', -- Replace with your Product ID
  'price_XYZ789', -- Replace with your Price ID
  2900,
  'eur',
  'month',
  '["10 GB storage", "Priority support", "Unlimited API calls", "Advanced analytics"]'::jsonb,
  TRUE,
  2
);
```

Verify:
```bash
supabase db execute "SELECT * FROM subscription_plans;"
```

## Step 8: Test Payment Flow with Test Card

### Test Cards

Stripe provides test cards for various scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | ✅ Payment succeeds |
| `4000 0000 0000 0002` | ❌ Card declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure |

**Expiry**: Any future date (e.g., `12/34`)
**CVC**: Any 3 digits (e.g., `123`)
**ZIP**: Any 5 digits (e.g., `12345`)

### Test Subscription Flow

1. Start your app: `bun run dev`
2. Login as a user
3. Navigate to `/subscriptions` (or wherever your plan selector is)
4. Click "Subscribe" on a plan
5. You'll be redirected to Stripe Checkout
6. Fill in test card: `4242 4242 4242 4242`
7. Complete payment
8. You should be redirected to your success URL
9. Check your webhook listener terminal - you should see:
   ```
   customer.subscription.created
   invoice.payment_succeeded
   ```

### Verify in Database

```bash
supabase db execute "SELECT * FROM user_subscriptions WHERE status = 'active';"
supabase db execute "SELECT * FROM payment_history ORDER BY created_at DESC LIMIT 5;"
supabase db execute "SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;"
```

## Step 9: Test Webhook Events

### Trigger Test Events

While your webhook listener is running:

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test payment succeeded
stripe trigger invoice.payment_succeeded

# Test payment failed
stripe trigger invoice.payment_failed

# Test subscription cancelled
stripe trigger customer.subscription.deleted
```

Check your application logs and database to verify events are processed.

## Step 10: Verify Admin Panel (After Implementation)

1. Login as admin user
2. Navigate to `/admin/stripe`
3. You should see:
   - Current configuration status
   - Form to update API keys
   - Connection test button
4. Navigate to `/admin/subscriptions`
5. You should see:
   - List of all plans
   - Metrics (subscribers, MRR)
   - Create/Edit/Delete actions

## Common Issues & Troubleshooting

### Issue: "Stripe is not configured"

**Solution**: Verify your environment variables are loaded:
```bash
# In your Nuxt app
console.log(useRuntimeConfig().stripe.secretKey) // Should not be undefined
```

### Issue: Webhook signature verification failed

**Solutions**:
1. Ensure `STRIPE_WEBHOOK_SECRET` matches your Stripe CLI output
2. Verify you're using `readRawBody()` and not parsed JSON
3. Check `stripe-signature` header is present

### Issue: Database connection error

**Solution**: Verify Supabase is running:
```bash
supabase status
# Should show all services running
```

If not running:
```bash
supabase start
```

### Issue: Migration fails

**Solution**: Check for existing tables:
```bash
# Drop tables if you need to re-run migration
supabase db execute "DROP TABLE IF EXISTS webhook_logs, payment_history, user_subscriptions, subscription_plans, stripe_configuration CASCADE;"

# Re-run migration
supabase db push
```

### Issue: Checkout redirects to 404

**Solution**: Ensure your success/cancel URLs are correct:
```typescript
successUrl: `${window.location.origin}/subscriptions/success`,
cancelUrl: `${window.location.origin}/subscriptions`,
```

## Next Steps

1. ✅ **Implement Server Utils**: Create Stripe client, config loader, crypto utils
2. ✅ **Implement API Routes**: Checkout, webhooks, admin endpoints
3. ✅ **Implement Composables**: useSubscription, usePaymentHistory, etc.
4. ✅ **Implement UI Components**: Plan selector, subscription card, payment history
5. ✅ **Write Tests**: Unit tests for webhooks, E2E tests for checkout flow
6. ✅ **Configure Stripe Dashboard**: Enable Customer Portal, set up branding
7. ✅ **Production Setup**: Switch to live keys, configure real webhook endpoint

## Production Checklist

Before going live:

- [ ] Replace test keys with live keys (`sk_live_`, `pk_live_`)
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Enable Stripe Customer Portal with desired features
- [ ] Set up proper error logging and monitoring
- [ ] Configure dunning (retry logic for failed payments)
- [ ] Set up email notifications for payment events
- [ ] Review and adjust cancellation policies
- [ ] Test subscription flow end-to-end with real card (small amount)
- [ ] Verify tax settings (if applicable)
- [ ] Review Stripe compliance requirements for your region

## Useful Commands

```bash
# View Stripe events in dashboard
stripe events list --limit 10

# View specific event
stripe events retrieve evt_123abc

# View customer subscriptions
stripe subscriptions list --customer cus_123

# Cancel a subscription
stripe subscriptions cancel sub_123

# View webhook attempts
stripe webhook-endpoints list
```

## Resources

- [Stripe API Documentation](https://docs.stripe.com/api)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)
- [Stripe Checkout Documentation](https://docs.stripe.com/payments/checkout)
- [Stripe Webhooks Best Practices](https://docs.stripe.com/webhooks/best-practices)
- [Stripe Testing](https://docs.stripe.com/testing)
- [Nuxt Server Routes](https://nuxt.com/docs/guide/directory-structure/server)

## Getting Help

If you encounter issues:

1. Check the [data-model.md](./data-model.md) for database schema
2. Review [research.md](./research.md) for technical decisions
3. Check [contracts/api-routes.yaml](./contracts/api-routes.yaml) for API specs
4. Read [Stripe documentation](https://docs.stripe.com/)
5. Ask in project Slack/Discord

---

**You're all set!** 🎉

Now you're ready to start implementing the Stripe subscription management feature. Follow the task list generated by `/speckit.tasks` for step-by-step implementation guidance.
