<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I found an issue. Currently the customer is registered but shared among the merchant. It should be separated. Every merchant is an individual body. Write a full implementation plan to fix this.

This is a critical architectural issue. The correct model for this marketplace is: **one global auth identity per user, but every relationship with data (orders, loyalty, addresses, wishlist, CRM) is scoped to a specific store**.[^1][^2][^3]

***

# Multi-Tenant Customer Isolation — Full Implementation Plan

## The Problem Visualized

```
❌ CURRENT (Broken) Architecture
─────────────────────────────────
auth.users
  └── profiles (1 row per user, shared globally)
        ├── loyalty_points  ← shared across ALL stores!
        ├── addresses       ← shared across ALL stores!
        └── wishlists       ← any store can read this!

✅ TARGET Architecture
─────────────────────────────────
auth.users (global identity only)
  └── profiles (name, email, avatar — cosmetic only)
        │
        ├── store_customers [user_id + store_id]  ← PIVOT TABLE
        │     ├── Store A: loyalty=200, tier=gold, is_blocked=false
        │     └── Store B: loyalty=50,  tier=standard, is_blocked=false
        │
        ├── customer_addresses (shared pool, customer-owned)
        │     └── linked at checkout per store via order.address snapshot
        │
        ├── wishlists          (store_id enforced)
        ├── product_reviews    (store_id enforced)
        └── customer_orders    (store_id enforced)
```


***

## Migration File

**`supabase/migrations/20260326_multi_tenant_customer_isolation.sql`**:[^4][^1]

```sql
-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: CREATE store_customers PIVOT TABLE
-- The single source of truth for a customer's relationship with ONE store.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.store_customers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

  -- Store-specific customer data (never shared with other stores)
  customer_number      TEXT,            -- Auto-generated e.g. "STA-00042"
  loyalty_points       INTEGER  NOT NULL DEFAULT 0,
  loyalty_tier         TEXT     NOT NULL DEFAULT 'standard'
                        CHECK (loyalty_tier IN ('standard','silver','gold','platinum')),
  total_spent          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders         INTEGER  NOT NULL DEFAULT 0,
  avg_order_value      NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_order_at       TIMESTAMPTZ,
  last_order_at        TIMESTAMPTZ,

  -- Merchant-managed fields (from CRM)
  tags                 TEXT[]   NOT NULL DEFAULT '{}',
  segment              TEXT,            -- 'new','returning','vip','at_risk','inactive'
  notes                TEXT,
  is_blocked           BOOLEAN  NOT NULL DEFAULT false,
  is_subscribed        BOOLEAN  NOT NULL DEFAULT true,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, store_id)  -- one relationship per customer per store
);

-- Indexes
CREATE INDEX IF NOT EXISTS sc_store_segment_spent_idx
  ON public.store_customers(store_id, segment, total_spent DESC);

CREATE INDEX IF NOT EXISTS sc_store_tier_idx
  ON public.store_customers(store_id, loyalty_tier);

CREATE INDEX IF NOT EXISTS sc_user_idx
  ON public.store_customers(user_id);

-- Auto-generate customer number on insert
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
DECLARE
  store_prefix TEXT;
  next_seq     INTEGER;
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO store_prefix
  FROM public.stores WHERE id = NEW.store_id;

  SELECT COUNT(*) + 1 INTO next_seq
  FROM public.store_customers WHERE store_id = NEW.store_id;

  NEW.customer_number := store_prefix || '-' || LPAD(next_seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_gen_customer_number
  BEFORE INSERT ON public.store_customers
  FOR EACH ROW WHEN (NEW.customer_number IS NULL)
  EXECUTE FUNCTION generate_customer_number();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;

-- Customers see only their own records
CREATE POLICY "sc_customer_read_own" ON public.store_customers
  FOR SELECT USING (auth.uid() = user_id);

-- Merchants see only their store's customers
CREATE POLICY "sc_merchant_read_own_store" ON public.store_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = store_id AND owner_id = auth.uid()
    )
  );

-- Merchants can update CRM fields for their store's customers
CREATE POLICY "sc_merchant_update_own_store" ON public.store_customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = store_id AND owner_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: BACKFILL — create store_customers rows from existing orders
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.store_customers (
  user_id, store_id,
  total_spent, total_orders, avg_order_value,
  first_order_at, last_order_at,
  loyalty_points
)
SELECT
  o.user_id,
  o.store_id,
  COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('completed','delivered')), 0),
  COUNT(o.id),
  COALESCE(AVG(o.total) FILTER (WHERE o.status IN ('completed','delivered')), 0),
  MIN(o.created_at),
  MAX(o.created_at),
  -- Migrate loyalty: if existing profiles table has points, try to match
  COALESCE((
    SELECT COALESCE(SUM(lt.points), 0)
    FROM public.loyalty_transactions lt
    WHERE lt.customer_id = o.user_id
      AND lt.store_id    = o.store_id
      AND lt.type        = 'earn'
  ) - (
    SELECT COALESCE(SUM(lt.points), 0)
    FROM public.loyalty_transactions lt
    WHERE lt.customer_id = o.user_id
      AND lt.store_id    = o.store_id
      AND lt.type        = 'redeem'
  ), 0)
FROM public.orders o
WHERE o.user_id IS NOT NULL
GROUP BY o.user_id, o.store_id
ON CONFLICT (user_id, store_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: ADD store_id TO TABLES THAT WERE MISSING IT
-- ══════════════════════════════════════════════════════════════════════════════

-- loyalty_transactions: add store_id (was missing — global leak)
ALTER TABLE public.loyalty_transactions
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS lt_store_customer_idx
  ON public.loyalty_transactions(store_id, customer_id, created_at DESC);

-- Backfill store_id on loyalty_transactions from orders
UPDATE public.loyalty_transactions lt
SET store_id = o.store_id
FROM public.orders o
WHERE lt.order_id = o.id
  AND lt.store_id IS NULL;

-- Make store_id NOT NULL after backfill
ALTER TABLE public.loyalty_transactions
  ALTER COLUMN store_id SET NOT NULL;

-- Drop old loyalty_points column from profiles (now lives in store_customers)
-- SAFE: only after confirming backfill above is complete
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS loyalty_points;

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: FIX RLS ON ALL CUSTOMER-FACING TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ── wishlists ─────────────────────────────────────────────────────────────────
-- Already has store_id, but RLS only checked customer_id — merchants could
-- technically query cross-store if policy was misconfigured. Harden it:
DROP POLICY IF EXISTS "customers_own_wishlist" ON public.wishlists;

CREATE POLICY "wishlist_customer_own" ON public.wishlists
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Merchants can only read wishlists for their own store (analytics)
CREATE POLICY "wishlist_merchant_read" ON public.wishlists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ── customer_addresses ────────────────────────────────────────────────────────
-- Addresses are owned by the customer (platform-level for UX convenience).
-- Merchants CANNOT read a customer's saved addresses — they only see
-- the address snapshot stored on each order.
DROP POLICY IF EXISTS "customers_own_addresses" ON public.customer_addresses;

CREATE POLICY "addresses_customer_only" ON public.customer_addresses
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);
-- No merchant policy — merchants see address via orders.delivery_address (JSONB snapshot)

-- ── product_reviews ───────────────────────────────────────────────────────────
-- Already has store_id. Merchants read only their store's reviews.
CREATE POLICY IF NOT EXISTS "reviews_merchant_read" ON public.product_reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- Merchants can reply to their store's reviews
CREATE POLICY "reviews_merchant_reply" ON public.product_reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    -- Merchants can ONLY update merchant_reply and is_visible — not rating/body
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ── customer_notifications ────────────────────────────────────────────────────
-- Add store_id so customers see store-specific notifications in the right context
ALTER TABLE public.customer_notifications
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cn_customer_store_idx
  ON public.customer_notifications(customer_id, store_id, is_read, created_at DESC)
  WHERE is_archived = FALSE;

-- ── orders ────────────────────────────────────────────────────────────────────
-- Orders already have store_id. Ensure customers can only see their OWN orders
-- and merchants can only see orders for THEIR store.
DROP POLICY IF EXISTS "orders_customer_read" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_read" ON public.orders;

CREATE POLICY "orders_customer_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_merchant_own_store" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY "orders_merchant_update_own_store" ON public.orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ── loyalty_transactions ──────────────────────────────────────────────────────
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_customer_read" ON public.loyalty_transactions;

CREATE POLICY "loyalty_customer_own" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "loyalty_merchant_read" ON public.loyalty_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ── crm_contacts ─────────────────────────────────────────────────────────────
-- CRM contacts are purely merchant-facing, no customer RLS needed,
-- but merchants must only see their own store's contacts.
DROP POLICY IF EXISTS "merchants_own_crm" ON public.crm_contacts;

CREATE POLICY "crm_merchant_own_store" ON public.crm_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: TRIGGERS — auto-create store_customers on first order
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_store_customer_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Upsert store_customer record
  INSERT INTO public.store_customers (
    user_id, store_id, total_orders, total_spent,
    avg_order_value, first_order_at, last_order_at
  )
  VALUES (
    NEW.user_id, NEW.store_id, 1, 0, 0, NEW.created_at, NEW.created_at
  )
  ON CONFLICT (user_id, store_id) DO NOTHING;

  -- If order moved to completed/delivered, update stats
  IF NEW.status IN ('completed', 'delivered') AND
    (OLD IS NULL OR OLD.status NOT IN ('completed', 'delivered')) THEN

    UPDATE public.store_customers
    SET
      total_orders    = total_orders + 1,
      total_spent     = total_spent  + NEW.total,
      avg_order_value = (total_spent + NEW.total) / (total_orders + 1),
      last_order_at   = NEW.created_at,
      first_order_at  = COALESCE(first_order_at, NEW.created_at),
      updated_at      = now()
    WHERE user_id = NEW.user_id AND store_id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_store_customer
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION sync_store_customer_on_order();

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 6: SYNC store_customers ↔ crm_contacts
-- Keep CRM contacts in sync when store_customer is updated
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_crm_from_store_customer()
RETURNS TRIGGER AS $$
DECLARE
  customer_profile RECORD;
BEGIN
  SELECT full_name, avatar_url, phone, email
  INTO customer_profile
  FROM public.profiles
  JOIN auth.users ON auth.users.id = profiles.id
  WHERE profiles.id = NEW.user_id;

  INSERT INTO public.crm_contacts (
    store_id, user_id, full_name, email, phone, avatar_url,
    total_orders, total_spent, avg_order_value,
    loyalty_points, loyalty_tier, tags, segment,
    is_subscribed, is_blocked, first_order_at, last_order_at
  )
  VALUES (
    NEW.store_id, NEW.user_id,
    customer_profile.full_name, customer_profile.email,
    customer_profile.phone, customer_profile.avatar_url,
    NEW.total_orders, NEW.total_spent, NEW.avg_order_value,
    NEW.loyalty_points, NEW.loyalty_tier,
    NEW.tags, NEW.segment,
    NEW.is_subscribed, NEW.is_blocked,
    NEW.first_order_at, NEW.last_order_at
  )
  ON CONFLICT (store_id, user_id) DO UPDATE SET
    total_orders    = EXCLUDED.total_orders,
    total_spent     = EXCLUDED.total_spent,
    avg_order_value = EXCLUDED.avg_order_value,
    loyalty_points  = EXCLUDED.loyalty_points,
    loyalty_tier    = EXCLUDED.loyalty_tier,
    tags            = EXCLUDED.tags,
    segment         = EXCLUDED.segment,
    is_subscribed   = EXCLUDED.is_subscribed,
    is_blocked      = EXCLUDED.is_blocked,
    last_order_at   = EXCLUDED.last_order_at,
    updated_at      = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_crm
  AFTER INSERT OR UPDATE ON public.store_customers
  FOR EACH ROW EXECUTE FUNCTION sync_crm_from_store_customer();

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 7: LOYALTY — now store-scoped
-- ══════════════════════════════════════════════════════════════════════════════

-- Update loyalty trigger to keep store_customers.loyalty_points in sync
CREATE OR REPLACE FUNCTION sync_loyalty_to_store_customer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.store_customers
  SET
    loyalty_points = (
      SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE -points END), 0)
      FROM public.loyalty_transactions
      WHERE customer_id = NEW.customer_id AND store_id = NEW.store_id
    ),
    loyalty_tier = (
      SELECT CASE
        WHEN SUM(CASE WHEN type='earn' THEN points ELSE 0 END) >= 10000 THEN 'platinum'
        WHEN SUM(CASE WHEN type='earn' THEN points ELSE 0 END) >= 5000  THEN 'gold'
        WHEN SUM(CASE WHEN type='earn' THEN points ELSE 0 END) >= 1000  THEN 'silver'
        ELSE 'standard'
      END
      FROM public.loyalty_transactions
      WHERE customer_id = NEW.customer_id
        AND store_id    = NEW.store_id
        AND type        = 'earn'
    ),
    updated_at = now()
  WHERE user_id = NEW.customer_id AND store_id = NEW.store_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_loyalty_sync
  AFTER INSERT OR UPDATE ON public.loyalty_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_loyalty_to_store_customer();

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 8: crm_contacts — add user_id for cross-reference
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_store_user_idx
  ON public.crm_contacts(store_id, user_id)
  WHERE user_id IS NOT NULL;
```


***

## Data Layer Updates

**`apps/web/src/lib/data/store-customer.ts`**:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import type { User } from '@supabase/supabase-js'

export interface StoreCustomer {
  id: string
  user_id: string
  store_id: string
  customer_number: string
  loyalty_points: number
  loyalty_tier: 'standard' | 'silver' | 'gold' | 'platinum'
  total_spent: number
  total_orders: number
  avg_order_value: number
  first_order_at: string | null
  last_order_at: string | null
  tags: string[]
  segment: string | null
  is_blocked: boolean
  is_subscribed: boolean
}

// ── Get or create a store_customer record ────────────────────────────────────
export async function getOrCreateStoreCustomer(
  userId: string,
  storeId: string
): Promise<StoreCustomer> {
  const supabase = await createServerClient()

  const { data: existing } = await supabase
    .from('store_customers')
    .select('*')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single()

  if (existing) return existing as StoreCustomer

  // First visit to this store — create record
  const { data, error } = await supabase
    .from('store_customers')
    .insert({ user_id: userId, store_id: storeId })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as StoreCustomer
}

// ── Customer's view: loyalty/tier for a SPECIFIC store ───────────────────────
export async function getStoreCustomerForUser(
  userId: string,
  storeId: string
): Promise<StoreCustomer | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('store_customers')
    .select('*')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single()
  return data as StoreCustomer | null
}

// ── Merchant's view: all customers for their store ───────────────────────────
export const getMerchantCustomers = unstable_cache(
  async (storeId: string, page = 1, pageSize = 50) => {
    const supabase = await createServerClient()
    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1

    const { data, count } = await supabase
      .from('store_customers')
      .select(`
        *,
        profiles!user_id (
          full_name, email, avatar_url, phone
        )
      `, { count: 'exact' })
      .eq('store_id', storeId)
      .order('total_spent', { ascending: false })
      .range(from, to)

    return {
      customers: data ?? [],
      total: count ?? 0,
      hasMore: (data?.length ?? 0) === pageSize,
    }
  },
  ['merchant-customers'],
  { revalidate: 60, tags: ['crm'] }
)

// ── Customer's stores: all stores they've shopped at ─────────────────────────
export async function getCustomerStores(userId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('store_customers')
    .select(`
      loyalty_points, loyalty_tier, total_orders, total_spent, last_order_at,
      stores (
        id, name, slug, logo_url, primary_color, city
      )
    `)
    .eq('user_id', userId)
    .order('last_order_at', { ascending: false })
  return data ?? []
}
```


***

## Updated Server Actions

**`apps/web/src/lib/actions/loyalty.ts`** — now fully store-scoped:

```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getOrCreateStoreCustomer } from '@/lib/data/store-customer'

// ── Earn points (called from order completion webhook) ────────────────────────
export async function earnLoyaltyPoints(
  userId: string,
  storeId: string,
  orderId: string,
  orderTotal: number
) {
  const supabase = await createServerClient()
  await getOrCreateStoreCustomer(userId, storeId)

  // Rule: 1 point per RM 1 spent (rounded down)
  const points = Math.floor(orderTotal)
  if (points <= 0) return

  const { error } = await supabase
    .from('loyalty_transactions')
    .insert({
      customer_id:  userId,
      store_id:     storeId,       // ← store-scoped
      order_id:     orderId,
      type:         'earn',
      points,
      description:  `Earned for order #${orderId.slice(-6).toUpperCase()}`,
    })

  if (error) throw new Error(error.message)
  // Trigger will auto-update store_customers.loyalty_points
}

// ── Redeem points at checkout ─────────────────────────────────────────────────
export async function redeemLoyaltyPoints(
  userId: string,
  storeId: string,
  pointsToRedeem: number,
  orderId: string
): Promise<number> {
  const supabase = await createServerClient()

  // Verify balance for THIS store only
  const sc = await getOrCreateStoreCustomer(userId, storeId)
  if (sc.loyalty_points < pointsToRedeem) {
    throw new Error(`Insufficient points. Balance: ${sc.loyalty_points}`)
  }

  // 100 points = RM 1 discount
  const discountAmount = pointsToRedeem / 100

  const { error } = await supabase
    .from('loyalty_transactions')
    .insert({
      customer_id:  userId,
      store_id:     storeId,       // ← store-scoped
      order_id:     orderId,
      type:         'redeem',
      points:       pointsToRedeem,
      description:  `Redeemed for RM${discountAmount.toFixed(2)} discount`,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/checkout')
  return discountAmount
}

// ── Get loyalty summary for a specific store ──────────────────────────────────
export async function getStoreLoyaltySummary(userId: string, storeId: string) {
  const supabase = await createServerClient()
  const { data: sc } = await supabase
    .from('store_customers')
    .select('loyalty_points, loyalty_tier, total_spent, total_orders')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single()

  if (!sc) return null

  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('points, type, description, created_at')
    .eq('customer_id', userId)
    .eq('store_id', storeId)     // ← store-scoped
    .order('created_at', { ascending: false })
    .limit(10)

  const TIER_THRESHOLDS = {
    standard: { min: 0,    max: 999,  next: 'silver',   needed: 1000  },
    silver:   { min: 1000, max: 4999, next: 'gold',     needed: 5000  },
    gold:     { min: 5000, max: 9999, next: 'platinum', needed: 10000 },
    platinum: { min: 10000,max: Infinity, next: null,   needed: null  },
  }

  const tier     = sc.loyalty_tier as keyof typeof TIER_THRESHOLDS
  const tierInfo = TIER_THRESHOLDS[tier]
  const earnedTotal = (transactions ?? [])
    .filter((t) => t.type === 'earn')
    .reduce((s, t) => s + t.points, 0)

  const progressToNext = tierInfo.needed
    ? Math.min(100, Math.round((earnedTotal / tierInfo.needed) * 100))
    : 100

  return {
    points:          sc.loyalty_points,
    tier:            sc.loyalty_tier,
    tierInfo,
    progressToNext,
    earnedTotal,
    transactions:    transactions ?? [],
    cashValue:       (sc.loyalty_points / 100).toFixed(2),
  }
}
```


***

## Updated Account Pages

**`apps/web/src/app/account/page.tsx`** — now store-aware:

```tsx
import { getCustomerStores } from '@/lib/data/store-customer'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

const TIER_CONFIG = {
  standard: { icon: '🥉', color: '#6B7280', label: 'Standard',  bg: '#F3F4F6' },
  silver:   { icon: '🥈', color: '#9CA3AF', label: 'Silver',    bg: '#F9FAFB' },
  gold:     { icon: '🥇', color: '#F59E0B', label: 'Gold',      bg: '#FFFBEB' },
  platinum: { icon: '💎', color: '#8B5CF6', label: 'Platinum',  bg: '#F5F3FF' },
}

export default async function AccountPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account')

  const [profileRes, ordersRes, storeRelationships] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('id, status, created_at, total, store_id, stores(name, slug, logo_url, primary_color)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    getCustomerStores(user.id),
  ])

  const orders = ordersRes.data ?? []
  const stores = storeRelationships

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back, {profileRes.data?.full_name?.split(' ')[^0] ?? 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          You've shopped at {stores.length} store{stores.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Per-store loyalty cards */}
      {stores.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            🏆 Your Loyalty Status
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stores.map((sc: any) => {
              const store = sc.stores
              const tier  = sc.loyalty_tier as keyof typeof TIER_CONFIG
              const cfg   = TIER_CONFIG[tier]
              return (
                <Link
                  key={store.id}
                  href={`/stores/${store.slug}/account`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {store.logo_url ? (
                      <Image src={store.logo_url} alt={store.name} width={44} height={44} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold"
                        style={{ backgroundColor: `${store.primary_color}20`, color: store.primary_color }}>
                        {store.name[^0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{store.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">{sc.total_orders} orders</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold" style={{ color: store.primary_color }}>
                      {sc.loyalty_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">Recent Orders</h2>
          <Link href="/orders" className="text-xs text-indigo-600 font-semibold hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {orders.map((order: any) => {
            const store = order.stores
            return (
              <Link key={order.id} href={`/orders/${order.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {store?.logo_url ? (
                    <Image src={store.logo_url} alt={store.name} width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">🏪</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{store?.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">RM {order.total.toFixed(2)}</p>
                  <p className="text-xs capitalize text-gray-400">{order.status.replace(/_/g, ' ')}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```


***

## Store-Scoped Account Context Page

**`apps/web/src/app/stores/[slug]/account/page.tsx`** — loyalty, wishlist, and orders scoped to one store:

```tsx
import { createServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getStore } from '@/lib/data/stores'
import { getOrCreateStoreCustomer } from '@/lib/data/store-customer'
import { getStoreLoyaltySummary } from '@/lib/actions/loyalty'
import { StoreAccountClient } from './StoreAccountClient'

export default async function StoreAccountPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase  = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/stores/${slug}/account`)

  const store = await getStore(slug)
  if (!store) notFound()

  const [storeCustomer, loyalty, recentOrders, wishlistCount] = await Promise.all([
    getOrCreateStoreCustomer(user.id, store.id),
    getStoreLoyaltySummary(user.id, store.id),
    supabase
      .from('orders')
      .select('id, status, total, created_at')
      .eq('user_id', user.id)
      .eq('store_id', store.id)      // ← STORE-SCOPED
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('wishlists')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('store_id', store.id),    // ← STORE-SCOPED
  ])

  return (
    <StoreAccountClient
      store={store}
      storeCustomer={storeCustomer}
      loyalty={loyalty}
      recentOrders={recentOrders.data ?? []}
      wishlistCount={wishlistCount.count ?? 0}
    />
  )
}
```


***

## CRM Dashboard — Updated Merchant Query

Replace the existing merchant CRM data fetch (now pulls from `store_customers` instead of raw `profiles`):[^5]

**`apps/web/src/lib/data/crm.ts`**:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

// ── All customers for a merchant — STORE SCOPED ───────────────────────────────
export const getMerchantCrmContacts = unstable_cache(
  async (storeId: string) => {
    const supabase = await createServerClient()

    // Join store_customers with profiles for display info
    const { data } = await supabase
      .from('store_customers')
      .select(`
        id, customer_number, loyalty_points, loyalty_tier,
        total_spent, total_orders, avg_order_value,
        first_order_at, last_order_at,
        tags, segment, notes, is_blocked, is_subscribed,
        profiles!user_id (
          id, full_name, avatar_url, phone,
          auth_users:id ( email )
        )
      `)
      .eq('store_id', storeId)     // ← THIS STORE ONLY
      .order('total_spent', { ascending: false })

    return (data ?? []).map((sc: any) => ({
      id:               sc.id,
      user_id:          sc.profiles?.id,
      customer_number:  sc.customer_number,
      full_name:        sc.profiles?.full_name ?? 'Unknown',
      email:            sc.profiles?.auth_users?.email ?? null,
      phone:            sc.profiles?.phone ?? null,
      avatar_url:       sc.profiles?.avatar_url ?? null,
      loyalty_points:   sc.loyalty_points,
      loyalty_tier:     sc.loyalty_tier,
      total_spent:      sc.total_spent,
      total_orders:     sc.total_orders,
      avg_order_value:  sc.avg_order_value,
      first_order_at:   sc.first_order_at,
      last_order_at:    sc.last_order_at,
      tags:             sc.tags,
      segment:          sc.segment,
      notes:            sc.notes,
      is_blocked:       sc.is_blocked,
      is_subscribed:    sc.is_subscribed,
    }))
  },
  ['merchant-crm'],
  { revalidate: 60, tags: ['crm'] }
)

// ── Block/unblock a customer — only for THIS store ────────────────────────────
export async function setCustomerBlocked(
  storeId: string,
  userId: string,
  blocked: boolean
) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('store_customers')
    .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  // This fires the sync trigger → updates crm_contacts automatically
}
```


***

## Checkout — Enforce Store-Scoped Block Check

**`apps/web/src/lib/actions/checkout.ts`** — add guard:

```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { getOrCreateStoreCustomer } from '@/lib/data/store-customer'

export async function validateCheckoutAccess(
  userId: string,
  storeId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const sc = await getOrCreateStoreCustomer(userId, storeId)

  if (sc.is_blocked) {
    return {
      allowed: false,
      reason: 'Your account has been suspended from this store. Please contact the merchant.',
    }
  }

  return { allowed: true }
}
```


***

## Architecture Summary

```
auth.users ─────────────────────────────────────── Platform identity (email, password)
    │
    ├── profiles ──────────────────────────────── Platform cosmetics (name, phone, avatar)
    │
    └── store_customers [user_id + store_id] ──── Per-store relationship (PIVOT)
          │
          ├── Store A record
          │     ├── loyalty_points: 350        ← Only for Store A
          │     ├── loyalty_tier: 'silver'     ← Only for Store A
          │     ├── is_blocked: false          ← Merchant A cannot affect Store B
          │     └── tags: ['vip']              ← Merchant A's CRM data
          │
          └── Store B record
                ├── loyalty_points: 50         ← Independent of Store A
                ├── loyalty_tier: 'standard'   ← Separate progression
                ├── is_blocked: true           ← Merchant B blocked this user
                └── tags: ['new']              ← Merchant B's CRM data
```

| Entity | Before (Broken) | After (Fixed) |
| :-- | :-- | :-- |
| `loyalty_points` | Single column in `profiles` — shared | Per `store_customers` row — isolated |
| `loyalty_transactions` | No `store_id` — any store could see | `store_id NOT NULL` — fully scoped |
| `crm_contacts` | Synced from unscoped profile | Synced from `store_customers` trigger |
| `orders` RLS | Any authenticated user | `auth.uid() = user_id` + merchant `store_id` check |
| `wishlists` | Customer-only RLS, merchant could leak | Store-scoped + merchant read-only policy |
| `customer_addresses` | No merchant access (good) | Hardened — merchant sees ONLY order snapshot |
| Block customer | No mechanism | `store_customers.is_blocked` per store |
| Customer number | None | Auto-generated `STO-00001` per store |

<span style="display:none">[^10][^11][^12][^13][^14][^15][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.iloveblogs.blog/guides/nextjs-supabase-multi-tenant-saas-architecture

[^2]: https://zenn.dev/shineos/articles/saas-multi-tenant-architecture-2025?locale=en

[^3]: https://clerk.com/blog/how-to-design-multitenant-saas-architecture

[^4]: https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/

[^5]: https://www.stacksync.com/blog/supabase-multi-tenancy-crm-integration

[^6]: https://makerkit.dev/blog/tutorials/supabase-rls-best-practices

[^7]: https://dev.to/pipipi-dev/building-multi-tenant-saas-as-a-solo-developer-1pi9

[^8]: https://www.youtube.com/watch?v=qaAMZbrayZc

[^9]: https://refine.dev/blog/supabase-database-setup/

[^10]: https://www.youtube.com/watch?v=sVrvYhh_VKE

[^11]: https://forum.cursor.com/t/next-js-16-supabase-multi-tenant-saas-template/151524

[^12]: https://supabase.com/features/visual-schema-designer

[^13]: https://render.com/articles/building-and-deploying-a-saas-application-from-scratch

[^14]: https://supabase.com/docs/guides/integrations/vercel-marketplace

[^15]: https://www.reddit.com/r/Supabase/comments/1p322xy/multitenant_saas/

