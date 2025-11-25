# Data Model

**Feature**: SaaS Starter Foundation
**Database**: PostgreSQL (via Supabase)
**Date**: 2025-11-25

## Database Schema

### Users Table (Extended from Supabase Auth)

**Table**: `public.profiles`

Extends Supabase's `auth.users` table with application-specific data.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('Admin', 'Contributor', 'User')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- Contributors can read all profiles (for support)
CREATE POLICY "Contributors can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Contributor')
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );
```

**Fields**:
- `id`: UUID (PK, FK to auth.users)
- `email`: TEXT (user's email, synced from auth.users)
- `role`: ENUM ('Admin', 'Contributor', 'User')
- `full_name`: TEXT (optional)
- `avatar_url`: TEXT (optional, URL to avatar image)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**Indexes**:
```sql
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
```

---

### Subscriptions Table

**Table**: `public.subscriptions`

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL, -- 'free', 'pro', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Contributors can read all subscriptions (for support)
CREATE POLICY "Contributors can read all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Contributor')
  );

-- Only server can write subscriptions (via service role)
```

**Fields**:
- `id`: UUID (PK)
- `user_id`: UUID (FK to profiles)
- `stripe_customer_id`: TEXT (Stripe Customer ID)
- `stripe_subscription_id`: TEXT (Stripe Subscription ID, nullable for free tier)
- `plan_type`: TEXT ('free', 'pro', 'enterprise')
- `status`: ENUM ('active', 'cancelled', 'expired', 'past_due')
- `current_period_start`: TIMESTAMP
- `current_period_end`: TIMESTAMP
- `cancel_at`: TIMESTAMP (scheduled cancellation date)
- `cancelled_at`: TIMESTAMP (actual cancellation date)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**Indexes**:
```sql
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
```

---

### Payment Configuration Table

**Table**: `public.payment_config`

Stores Stripe configuration (encrypted).

```sql
CREATE TABLE public.payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_public_key TEXT NOT NULL,
  stripe_secret_key_encrypted TEXT NOT NULL, -- Encrypted with Supabase Vault
  webhook_secret_encrypted TEXT NOT NULL,
  is_test_mode BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- Only Admins can read/write config
CREATE POLICY "Admins can manage payment config"
  ON public.payment_config
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );
```

**Fields**:
- `id`: UUID (PK)
- `stripe_public_key`: TEXT
- `stripe_secret_key_encrypted`: TEXT (encrypted)
- `webhook_secret_encrypted`: TEXT (encrypted)
- `is_test_mode`: BOOLEAN
- `created_by`: UUID (FK to profiles)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

---

## Relationships

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles
    ↓ (1:1)
subscriptions

profiles (Admin)
    ↓ (1:many)
payment_config
```

---

## Initial Data (Seed)

```sql
-- Insert first admin user (after manual signup)
UPDATE public.profiles
SET role = 'Admin'
WHERE email = 'admin@example.com';

-- Create free subscription for new users (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'User');

  INSERT INTO public.subscriptions (user_id, stripe_customer_id, plan_type, status)
  VALUES (NEW.id, '', 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Zod Schemas (TypeScript Validation)

```typescript
// server/utils/schemas.ts
import { z } from 'zod'

export const UserRoleSchema = z.enum(['Admin', 'Contributor', 'User'])

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const SubscriptionStatusSchema = z.enum(['active', 'cancelled', 'expired', 'past_due'])

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  stripe_customer_id: z.string(),
  stripe_subscription_id: z.string().nullable(),
  plan_type: z.string(),
  status: SubscriptionStatusSchema,
  current_period_start: z.string().datetime().nullable(),
  current_period_end: z.string().datetime().nullable(),
  cancel_at: z.string().datetime().nullable(),
  cancelled_at: z.string().datetime().nullable()
})

// Request validation schemas
export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional()
})

export const UpdateRoleSchema = z.object({
  role: UserRoleSchema
})
```

---

## Migration File

**File**: `supabase/migrations/001_initial_schema.sql`

Contains all CREATE TABLE, RLS policies, triggers, and indexes above.

---

**Status**: ✅ Data model complete, ready for API contracts
