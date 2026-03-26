<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Write a full implementation plan to add a loyalty program system, which merchant can set their own point system, ranking system, redemption,

You can add a full merchant-configurable loyalty system with points, tiers, and redemptions by extending your DB, APIs, and UI in structured steps.

***

## 1. Program Design (Per Merchant)

For each **store/merchant**, allow configuration of:

- Points:
    - Base earn rate: e.g. 1 point per RM 1.
    - Earn actions: order paid, review written, referral (future).
    - Expiry: optional (e.g. 12 months).
- Tiers (3–4 recommended for clarity ):[^1][^2]
    - Name, threshold (points or lifetime spend), multiplier, perks.
- Redemption:
    - Conversion: X points = RM Y.
    - Min points to redeem.
    - Allowed redemption types: discount on order, free shipping, free item.
    - Max discount percentage per order (e.g. 20%).[^2][^3]

***

## 2. Database Schema (Supabase)

### 2.1 Loyalty Settings (per store)

```sql
-- Loyalty program settings per store
CREATE TABLE public.loyalty_programs (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id            uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  is_enabled          boolean NOT NULL DEFAULT false,
  base_points_per_myr numeric(10,2) NOT NULL DEFAULT 1.0, -- 1 point per RM by default
  min_order_amount_myr numeric(10,2) NOT NULL DEFAULT 0.00,
  point_expiry_months integer, -- NULL = never expires
  max_redeem_pct      numeric(5,2) NOT NULL DEFAULT 20.00, -- max % of order covered by points
  currency_code       text NOT NULL DEFAULT 'MYR',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT loyalty_programs_store_unique UNIQUE (store_id),
  CONSTRAINT loyalty_programs_base_points_positive CHECK (base_points_per_myr >= 0),
  CONSTRAINT loyalty_programs_max_redeem_pct_range CHECK (max_redeem_pct >= 0 AND max_redeem_pct <= 100)
);

CREATE INDEX loyalty_programs_store_idx ON public.loyalty_programs(store_id);
```


### 2.2 Tiers (per store)

Use 3–4 tiers per best practices (e.g. Bronze, Silver, Gold, VIP).[^4][^1]

```sql
CREATE TYPE loyalty_tier_qualifier AS ENUM ('points', 'lifetime_spend');

CREATE TABLE public.loyalty_tiers (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sort_order     integer NOT NULL DEFAULT 0,
  name           text NOT NULL,
  description    text,
  color          text, -- e.g. '#F97316'
  icon           text, -- e.g. '⭐'
  qualifier_type loyalty_tier_qualifier NOT NULL DEFAULT 'points',
  threshold_value numeric(12,2) NOT NULL,  -- points or RM
  multiplier     numeric(6,3) NOT NULL DEFAULT 1.0, -- e.g. 1.2x points
  benefits       jsonb, -- arbitrary perks: free_shipping, priority_support, etc.
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT loyalty_tiers_threshold_positive CHECK (threshold_value >= 0),
  CONSTRAINT loyalty_tiers_multiplier_positive CHECK (multiplier >= 0)
);

CREATE INDEX loyalty_tiers_store_idx ON public.loyalty_tiers(store_id);
CREATE INDEX loyalty_tiers_store_sort_idx ON public.loyalty_tiers(store_id, sort_order);
```


### 2.3 Customer Balances (per store)

```sql
CREATE TABLE public.loyalty_balances (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id         uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  current_points   integer NOT NULL DEFAULT 0,
  lifetime_points  integer NOT NULL DEFAULT 0,
  lifetime_spend   numeric(14,2) NOT NULL DEFAULT 0.00,
  current_tier_id  uuid REFERENCES public.loyalty_tiers(id),
  last_earned_at   timestamptz,
  last_redeemed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT loyalty_balances_points_nonneg CHECK (current_points >= 0),
  CONSTRAINT loyalty_balances_lifetime_points_nonneg CHECK (lifetime_points >= 0)
);

CREATE UNIQUE INDEX loyalty_balances_user_store_unique
  ON public.loyalty_balances(user_id, store_id);

CREATE INDEX loyalty_balances_tier_idx
  ON public.loyalty_balances(current_tier_id);
```


### 2.4 Transactions \& Expiry

```sql
CREATE TYPE loyalty_tx_type AS ENUM ('earn', 'redeem', 'expire', 'adjust');
CREATE TYPE loyalty_tx_source AS ENUM ('order', 'manual', 'campaign', 'refund');

CREATE TABLE public.loyalty_transactions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id      uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id      uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type          loyalty_tx_type NOT NULL,
  source        loyalty_tx_source NOT NULL DEFAULT 'order',
  points        integer NOT NULL,
  points_before integer NOT NULL,
  points_after  integer NOT NULL,
  description   text,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz, -- set for earn tx if expiry enabled
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT loyalty_transactions_points_nonzero CHECK (points <> 0)
);

CREATE INDEX loyalty_transactions_user_store_idx
  ON public.loyalty_transactions(user_id, store_id, occurred_at DESC);

CREATE INDEX loyalty_transactions_expiry_idx
  ON public.loyalty_transactions(store_id, expires_at)
  WHERE expires_at IS NOT NULL AND type = 'earn';
```


### 2.5 RLS (simple version)

```sql
-- Enable RLS
ALTER TABLE public.loyalty_balances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers        ENABLE ROW LEVEL SECURITY;

-- Helper is_store_owner() already exists in your project

-- Merchants manage their own program
CREATE POLICY "merchant_manage_loyalty_program"
  ON public.loyalty_programs
  USING     (is_store_owner(store_id))
  WITH CHECK(is_store_owner(store_id));

CREATE POLICY "merchant_manage_loyalty_tiers"
  ON public.loyalty_tiers
  USING     (is_store_owner(store_id))
  WITH CHECK(is_store_owner(store_id));

-- Customers see only their balances/transactions
CREATE POLICY "customers_read_their_balance"
  ON public.loyalty_balances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "customers_read_their_transactions"
  ON public.loyalty_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/merchant can read balances for their store
CREATE POLICY "merchant_read_store_balances"
  ON public.loyalty_balances
  FOR SELECT TO authenticated
  USING (is_store_owner(store_id) OR is_admin());
```


***

## 3. Earning Logic (on Order Paid)

### 3.1 Points Calculation Function

```sql
CREATE OR REPLACE FUNCTION public.calculate_loyalty_points(
  p_store_id uuid,
  p_user_id  uuid,
  p_order_id uuid,
  p_subtotal numeric,
  p_currency text DEFAULT 'MYR'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prog       public.loyalty_programs;
  balance    public.loyalty_balances;
  multiplier numeric(6,3) := 1.0;
  points     integer;
  tiers      public.loyalty_tiers[];
  expiry_ts  timestamptz;
BEGIN
  -- Fetch program
  SELECT * INTO prog
  FROM public.loyalty_programs
  WHERE store_id = p_store_id AND is_enabled = TRUE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF p_currency <> prog.currency_code THEN
    -- optional: handle FX later
  END IF;

  -- Ensure balance row exists
  INSERT INTO public.loyalty_balances (user_id, store_id)
  VALUES (p_user_id, p_store_id)
  ON CONFLICT (user_id, store_id) DO NOTHING;

  SELECT * INTO balance
  FROM public.loyalty_balances
  WHERE user_id = p_user_id AND store_id = p_store_id
  FOR UPDATE;

  -- Determine current tier multiplier
  IF balance.current_tier_id IS NOT NULL THEN
    SELECT multiplier INTO multiplier
    FROM public.loyalty_tiers
    WHERE id = balance.current_tier_id;
  END IF;

  -- Base points = base_rate * subtotal * tier multiplier
  points := FLOOR(prog.base_points_per_myr * p_subtotal * multiplier);

  IF points <= 0 THEN
    RETURN 0;
  END IF;

  -- Expiry
  IF prog.point_expiry_months IS NOT NULL THEN
    expiry_ts := (now() + (prog.point_expiry_months || ' months')::interval);
  ELSE
    expiry_ts := NULL;
  END IF;

  -- Record transaction
  INSERT INTO public.loyalty_transactions (
    user_id, store_id, order_id, type, source,
    points, points_before, points_after, description, expires_at
  ) VALUES (
    p_user_id, p_store_id, p_order_id, 'earn', 'order',
    points, balance.current_points, balance.current_points + points,
    'Points earned from order ' || p_order_id::text, expiry_ts
  );

  -- Update balance
  UPDATE public.loyalty_balances
  SET
    current_points  = current_points + points,
    lifetime_points = lifetime_points + points,
    lifetime_spend  = lifetime_spend + p_subtotal,
    last_earned_at  = now(),
    updated_at      = now()
  WHERE id = balance.id;

  -- Re-evaluate tier (simple: highest tier whose threshold is met)
  PERFORM public.recalculate_loyalty_tier(p_store_id, p_user_id);

  RETURN points;
END;
$$;
```


### 3.2 Tier Recalculation Function

```sql
CREATE OR REPLACE FUNCTION public.recalculate_loyalty_tier(
  p_store_id uuid,
  p_user_id  uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prog    public.loyalty_programs;
  bal     public.loyalty_balances;
  new_tier_id uuid;
BEGIN
  SELECT * INTO prog
  FROM public.loyalty_programs
  WHERE store_id = p_store_id AND is_enabled = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO bal
  FROM public.loyalty_balances
  WHERE user_id = p_user_id AND store_id = p_store_id
  FOR UPDATE;

  -- Find highest tier the customer qualifies for
  SELECT id INTO new_tier_id
  FROM public.loyalty_tiers
  WHERE store_id = p_store_id
    AND (
      (qualifier_type = 'points'        AND threshold_value <= bal.lifetime_points)
      OR
      (qualifier_type = 'lifetime_spend' AND threshold_value <= bal.lifetime_spend)
    )
  ORDER BY threshold_value DESC
  LIMIT 1;

  UPDATE public.loyalty_balances
  SET current_tier_id = new_tier_id,
      updated_at      = now()
  WHERE id = bal.id;
END;
$$;
```


### 3.3 Hook into “Order Paid”

In your existing Billplz webhook or order-payment-complete flow, call the function.

```sql
-- Example in a trigger after order status set to 'confirmed' or 'paid'
CREATE OR REPLACE FUNCTION public.handle_loyalty_on_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subtotal numeric;
  store   uuid;
BEGIN
  IF NEW.status = 'confirmed' OR NEW.status = 'paid' THEN
    -- Use subtotal or total_amount without delivery/service fee
    subtotal := NEW.subtotal_amount;
    store    := NEW.store_id;

    PERFORM public.calculate_loyalty_points(
      store,
      NEW.customer_id,
      NEW.id,
      subtotal,
      'MYR'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loyalty_on_order_paid
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status <> NEW.status AND NEW.status IN ('confirmed', 'paid'))
EXECUTE FUNCTION public.handle_loyalty_on_order_paid();
```


***

## 4. Redemption Logic (at Checkout)

### 4.1 Conversion \& Cap

Decide per store:

- Conversion: e.g. **100 points = RM 1**.
- Cap: e.g. max 20% of order subtotal can be covered by points.[^2]

Add to `loyalty_programs`:

```sql
ALTER TABLE public.loyalty_programs
  ADD COLUMN IF NOT EXISTS points_per_myr_redeem integer NOT NULL DEFAULT 100;
```


### 4.2 Redeem Function

```sql
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_store_id    uuid,
  p_user_id     uuid,
  p_order_id    uuid,
  p_subtotal    numeric,
  p_requested_points integer
) RETURNS TABLE (
  applied_points integer,
  discount_myr   numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prog      public.loyalty_programs;
  bal       public.loyalty_balances;
  max_by_pct numeric;
  max_by_balance integer;
  max_points integer;
  discount numeric;
BEGIN
  SELECT * INTO prog
  FROM public.loyalty_programs
  WHERE store_id = p_store_id AND is_enabled = TRUE;

  IF NOT FOUND OR p_requested_points <= 0 THEN
    RETURN QUERY SELECT 0, 0.0::numeric;
    RETURN;
  END IF;

  SELECT * INTO bal
  FROM public.loyalty_balances
  WHERE user_id = p_user_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND OR bal.current_points <= 0 THEN
    RETURN QUERY SELECT 0, 0.0::numeric;
    RETURN;
  END IF;

  -- Max discount by percentage cap
  max_by_pct     := (prog.max_redeem_pct / 100.0) * p_subtotal;
  max_points     := FLOOR(max_by_pct * prog.points_per_myr_redeem);

  -- Also cap by user's balance
  max_by_balance := bal.current_points;

  max_points := LEAST(max_points, max_by_balance, p_requested_points);

  IF max_points <= 0 THEN
    RETURN QUERY SELECT 0, 0.0::numeric;
    RETURN;
  END IF;

  discount := max_points::numeric / prog.points_per_myr_redeem;

  -- Record transaction
  INSERT INTO public.loyalty_transactions (
    user_id, store_id, order_id, type, source,
    points, points_before, points_after, description
  ) VALUES (
    p_user_id, p_store_id, p_order_id, 'redeem', 'order',
    -max_points, bal.current_points, bal.current_points - max_points,
    'Points redeemed on order ' || p_order_id::text
  );

  -- Update balance
  UPDATE public.loyalty_balances
  SET current_points   = current_points - max_points,
      last_redeemed_at = now(),
      updated_at       = now()
  WHERE id = bal.id;

  RETURN QUERY SELECT max_points, discount;
END;
$$;
```

You then:

- Call `redeem_loyalty_points` during **order creation** after validation.
- Apply `discount_myr` as loyalty discount in your order totals.
- Save `applied_points` and `discount_myr` into `orders` table fields.

***

## 5. Points Expiry Job

Run daily to convert expired “earn” entries into “expire” transactions and reduce balances.[^5][^2]

```sql
CREATE OR REPLACE FUNCTION public.expire_loyalty_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tx RECORD;
  bal public.loyalty_balances;
  points_to_expire integer;
BEGIN
  FOR tx IN
    SELECT id, user_id, store_id, points, expires_at
    FROM public.loyalty_transactions
    WHERE type = 'earn'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
      AND points > 0
  LOOP
    SELECT * INTO bal
    FROM public.loyalty_balances
    WHERE user_id = tx.user_id AND store_id = tx.store_id
    FOR UPDATE;

    IF NOT FOUND OR bal.current_points <= 0 THEN
      CONTINUE;
    END IF;

    points_to_expire := LEAST(bal.current_points, tx.points);

    INSERT INTO public.loyalty_transactions (
      user_id, store_id, order_id, type, source,
      points, points_before, points_after, description
    ) VALUES (
      tx.user_id, tx.store_id, NULL, 'expire', 'order',
      -points_to_expire, bal.current_points, bal.current_points - points_to_expire,
      'Points expired'
    );

    UPDATE public.loyalty_balances
    SET current_points = current_points - points_to_expire,
        updated_at     = now()
    WHERE id = bal.id;
  END LOOP;
END;
$$;
```

Expose via a cron API (similar to your other cron jobs) and schedule daily.

***

## 6. API \& UI

### 6.1 Merchant Settings UI (Web)

Add `/merchant/settings/loyalty`:

- Toggle: Enable/disable loyalty program.
- Fields:
    - Base earn rate (points per RM 1).
    - Min order amount to earn points.
    - Expiry months.
    - Max redemption percentage.
    - Conversion: points per RM redemption.
- Tier editor:
    - Add/edit/delete tiers:
        - Name, color, icon.
        - Threshold (points or spend).
        - Multiplier (1x, 1.5x).
        - Benefits list (chips: “Free shipping above RM X”, “Priority support”, etc.).

Use your existing Supabase browser client to call:

- `POST/PUT /api/merchant/loyalty/program`
- `POST/PUT /api/merchant/loyalty/tiers`


### 6.2 Customer UI (Web + Mobile)

- Store page:
    - Badge: “Earn points here” + simple explanation: “Earn 1 point per RM 1. Redeem up to 20% off.”
- Account → “Loyalty”:
    - Per-store list: store name, current points, current tier, next tier progress.
    - Transactions list (earn/redeem/expire).
- Checkout:
    - Show “Available points at this store”.
    - Input/slider: “Use X points (max Y)” → update total.
    - Show “You will earn Z points from this order”.

Best practices recommend **simple, visible tiers and easy redemption at checkout** to drive engagement.[^6][^7][^2]

***

## 7. Rollout Plan

1. Add DB tables \& functions (migrations).
2. Seed sensible default tiers for each store (e.g. Bronze, Silver, Gold).
3. Add merchant loyalty settings page.
4. Wire order-paid trigger to `calculate_loyalty_points`.
5. Add redemption UI at checkout + call `redeem_loyalty_points`.
6. Add daily cron to run `expire_loyalty_points`.
7. Add customer views (points, tiers, history).
8. Track KPIs: points issued, points redeemed rate, repeat orders (aim for 20–30% redemption rate ).[^5]

Would you prefer a **single, global default loyalty template** that merchants can just tweak (simpler), or fully custom programs per merchant with different tier names and rules (more complex but flexible)?
<span style="display:none">[^10][^11][^12][^13][^14][^15][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.brandmovers.com/elevating-customer-loyalty-with-tiered-loyalty-programs-guide

[^2]: https://ecosire.com/blog/loyalty-programs-points-tiers-referrals

[^3]: https://www.nector.io/blog/how-to-create-a-point-system-for-rewards

[^4]: https://www.growave.io/blog/how-to-design-loyalty-program

[^5]: https://fastercapital.com/articles/How-to-Design-Loyalty-Program-Tiers-for-Maximum-Retention-in-2025.html

[^6]: https://www.zigpoll.com/content/what-are-the-most-effective-strategies-for-designing-a-points-system-that-maximizes-customer-engagement-and-retention-in-a-competitive-market

[^7]: https://www.yotpo.com/blog/reward-point-system-for-customers/

[^8]: https://antavo.com/blog/loyalty-program-best-practices/

[^9]: https://www.openloyalty.io/insider/effective-tiered-loyalty-programs

[^10]: https://blog.brandmovers.com/customer-loyalty-trends-2025-a-guide-to-whats-actually-working

[^11]: https://dev.to/hackmamba/how-to-build-a-cloud-based-loyalty-rewards-app-in-nextjs-183f

[^12]: https://demo.shipone.day/blog/building-modern-saas-nextjs-supabase

[^13]: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

[^14]: https://rewardz.sg/blog/tier-based-loyalty-programmes/

[^15]: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

