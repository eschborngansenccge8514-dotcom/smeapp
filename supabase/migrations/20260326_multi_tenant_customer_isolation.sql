-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: CREATE store_customers PIVOT TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.store_customers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

  -- Store-specific customer data
  customer_number      TEXT,            
  loyalty_points       INTEGER  NOT NULL DEFAULT 0,
  loyalty_tier         TEXT     NOT NULL DEFAULT 'standard'
                        CHECK (loyalty_tier IN ('standard','silver','gold','platinum')),
  total_spent          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders         INTEGER  NOT NULL DEFAULT 0,
  avg_order_value      NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_order_at       TIMESTAMPTZ,
  last_order_at        TIMESTAMPTZ,

  -- Merchant-managed fields
  tags                 TEXT[]   NOT NULL DEFAULT '{}',
  segment              TEXT,            
  notes                TEXT,
  is_blocked           BOOLEAN  NOT NULL DEFAULT false,
  is_subscribed        BOOLEAN  NOT NULL DEFAULT true,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, store_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS sc_store_segment_spent_idx ON public.store_customers(store_id, segment, total_spent DESC);
CREATE INDEX IF NOT EXISTS sc_store_tier_idx ON public.store_customers(store_id, loyalty_tier);
CREATE INDEX IF NOT EXISTS sc_user_idx ON public.store_customers(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_customer_read_own" ON public.store_customers;
CREATE POLICY "sc_customer_read_own" ON public.store_customers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sc_merchant_read_own_store" ON public.store_customers;
CREATE POLICY "sc_merchant_read_own_store" ON public.store_customers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "sc_merchant_update_own_store" ON public.store_customers;
CREATE POLICY "sc_merchant_update_own_store" ON public.store_customers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: BACKFILL
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.store_customers (
  user_id, store_id,
  total_spent, total_orders, avg_order_value,
  first_order_at, last_order_at,
  loyalty_points
)
SELECT
  o.customer_id, 
  o.store_id,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'delivered'), 0),
  COUNT(o.id),
  COALESCE(AVG(o.total_amount) FILTER (WHERE o.status = 'delivered'), 0),
  MIN(o.created_at),
  MAX(o.created_at),
  COALESCE((
    SELECT COALESCE(SUM(lt.points), 0) FROM public.loyalty_transactions lt
    WHERE lt.user_id = o.customer_id AND lt.store_id = o.store_id AND lt.type = 'earn'
  ) - (
    SELECT COALESCE(SUM(lt.points), 0) FROM public.loyalty_transactions lt
    WHERE lt.user_id = o.customer_id AND lt.store_id = o.store_id AND lt.type = 'redeem'
  ), 0)
FROM public.orders o
WHERE o.customer_id IS NOT NULL
GROUP BY o.customer_id, o.store_id
ON CONFLICT (user_id, store_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: UPDATES & ALTERATIONS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS lt_store_customer_idx ON public.loyalty_transactions(store_id, user_id, created_at DESC);

UPDATE public.loyalty_transactions lt SET store_id = o.store_id FROM public.orders o WHERE lt.order_id = o.id AND lt.store_id IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: HARDEN RLS
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "customers_own_wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "wishlist_customer_own" ON public.wishlists;
CREATE POLICY "wishlist_customer_own" ON public.wishlists FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "wishlist_merchant_read" ON public.wishlists;
CREATE POLICY "wishlist_merchant_read" ON public.wishlists FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "customers_own_addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "addresses_customer_only" ON public.customer_addresses;
CREATE POLICY "addresses_customer_only" ON public.customer_addresses FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "reviews_merchant_read" ON public.product_reviews;
CREATE POLICY "reviews_merchant_read" ON public.product_reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "reviews_merchant_reply" ON public.product_reviews;
CREATE POLICY "reviews_merchant_reply" ON public.product_reviews FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cn_customer_store_idx ON public.customer_notifications(customer_id, store_id, is_read, created_at DESC) WHERE is_archived = FALSE;

DROP POLICY IF EXISTS "orders_customer_read" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_own" ON public.orders;
CREATE POLICY "orders_customer_own" ON public.orders FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "orders_merchant_read" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_own_store" ON public.orders;
CREATE POLICY "orders_merchant_own_store" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "orders_merchant_update_own_store" ON public.orders;
CREATE POLICY "orders_merchant_update_own_store" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_customer_read" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "loyalty_customer_own" ON public.loyalty_transactions;
CREATE POLICY "loyalty_customer_own" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "loyalty_merchant_read" ON public.loyalty_transactions;
CREATE POLICY "loyalty_merchant_read" ON public.loyalty_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "merchants_own_crm" ON public.crm_contacts;
DROP POLICY IF EXISTS "crm_merchant_own_store" ON public.crm_contacts;
CREATE POLICY "crm_merchant_own_store" ON public.crm_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: TRIGGERS & SYNC
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_store_customer_on_order() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.store_customers (user_id, store_id, total_orders, total_spent, avg_order_value, first_order_at, last_order_at)
  VALUES (NEW.customer_id, NEW.store_id, 1, 0, 0, NEW.created_at, NEW.created_at) ON CONFLICT (user_id, store_id) DO NOTHING;
  IF NEW.status = 'delivered' AND (OLD IS NULL OR OLD.status <> 'delivered') THEN
    UPDATE public.store_customers SET total_orders = total_orders + 1, total_spent = total_spent + NEW.total_amount, avg_order_value = (total_spent + NEW.total_amount) / (total_orders + 1), last_order_at = NEW.created_at, first_order_at = COALESCE(first_order_at, NEW.created_at), updated_at = now()
    WHERE user_id = NEW.customer_id AND store_id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_store_customer ON public.orders;
CREATE TRIGGER trg_sync_store_customer AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION sync_store_customer_on_order();

CREATE OR REPLACE FUNCTION sync_crm_from_store_customer() RETURNS TRIGGER AS $$
DECLARE customer_profile RECORD;
BEGIN
  SELECT full_name, avatar_url, phone, email INTO customer_profile FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.crm_contacts (store_id, user_id, full_name, email, phone, avatar_url, total_orders, total_spent, avg_order_value, loyalty_points, loyalty_tier, tags, segment, is_subscribed, is_blocked, first_order_at, last_order_at)
  VALUES (NEW.store_id, NEW.user_id, customer_profile.full_name, customer_profile.email, customer_profile.phone, customer_profile.avatar_url, NEW.total_orders, NEW.total_spent, NEW.avg_order_value, NEW.loyalty_points, NEW.loyalty_tier, NEW.tags, NEW.segment, NEW.is_subscribed, NEW.is_blocked, NEW.first_order_at, NEW.last_order_at)
  ON CONFLICT (store_id, user_id) DO UPDATE SET total_orders = EXCLUDED.total_orders, total_spent = EXCLUDED.total_spent, avg_order_value = EXCLUDED.avg_order_value, loyalty_points = EXCLUDED.loyalty_points, loyalty_tier = EXCLUDED.loyalty_tier, tags = EXCLUDED.tags, segment = EXCLUDED.segment, is_subscribed = EXCLUDED.is_subscribed, is_blocked = EXCLUDED.is_blocked, last_order_at = EXCLUDED.last_order_at, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_crm ON public.store_customers;
CREATE TRIGGER trg_sync_crm AFTER INSERT OR UPDATE ON public.store_customers FOR EACH ROW EXECUTE FUNCTION sync_crm_from_store_customer();

CREATE OR REPLACE FUNCTION sync_loyalty_to_store_customer() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.store_customers SET loyalty_points = (SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE -points END), 0) FROM public.loyalty_transactions WHERE user_id = NEW.user_id AND store_id = NEW.store_id), loyalty_tier = (SELECT CASE WHEN SUM(CASE WHEN type='earn' THEN points ELSE 0 END) >= 10000 THEN 'platinum' WHEN SUM(CASE WHEN type='earn' THEN points ELSE 0 END) >= 5000  THEN 'gold' WHEN SUM(CASE WHEN type='earn' THEN points ELSE 0 END) >= 1000  THEN 'silver' ELSE 'standard' END FROM public.loyalty_transactions WHERE user_id = NEW.user_id AND store_id = NEW.store_id AND type = 'earn'), updated_at = now()
  WHERE user_id = NEW.user_id AND store_id = NEW.store_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_loyalty_sync ON public.loyalty_transactions;
CREATE TRIGGER trg_loyalty_sync AFTER INSERT OR UPDATE ON public.loyalty_transactions FOR EACH ROW EXECUTE FUNCTION sync_loyalty_to_store_customer();

ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
DROP INDEX IF EXISTS crm_contacts_store_user_idx;
CREATE UNIQUE INDEX crm_contacts_store_user_idx ON public.crm_contacts(store_id, user_id) WHERE user_id IS NOT NULL;
