-- supabase/migrations/20260326_notifications_email_crm.sql

-- Ensure orders has customer_info columns for CRM sync if they aren't there
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchant_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,   -- 'new_order'|'low_stock'|'review'|'payment'|'system'|'promo'
  title         TEXT NOT NULL,
  body          TEXT,
  link          TEXT,            -- relative URL to navigate to
  metadata      JSONB DEFAULT '{}',
  is_read       BOOLEAN DEFAULT FALSE,
  is_archived   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_store_unread_idx ON public.merchant_notifications(store_id, is_read, created_at DESC);

ALTER TABLE public.merchant_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant reads own notifications') THEN
    CREATE POLICY "Merchant reads own notifications"
      ON public.merchant_notifications FOR ALL
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ─────────────────────────────────────────
-- NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  new_order_push      BOOLEAN DEFAULT TRUE,
  new_order_email     BOOLEAN DEFAULT TRUE,
  low_stock_push      BOOLEAN DEFAULT TRUE,
  low_stock_email     BOOLEAN DEFAULT TRUE,
  low_stock_threshold INTEGER DEFAULT 5,
  new_review_push     BOOLEAN DEFAULT TRUE,
  new_review_email    BOOLEAN DEFAULT FALSE,
  payment_push        BOOLEAN DEFAULT TRUE,
  payment_email       BOOLEAN DEFAULT TRUE,
  system_push         BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_start         TIME DEFAULT '22:00',
  quiet_end           TIME DEFAULT '08:00',
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant manages own preferences') THEN
    CREATE POLICY "Merchant manages own preferences"
      ON public.notification_preferences FOR ALL
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ─────────────────────────────────────────
-- EMAIL CAMPAIGNS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  preview_text    TEXT,
  body_html       TEXT NOT NULL,
  body_text       TEXT,
  from_name       TEXT NOT NULL,
  from_email      TEXT NOT NULL,
  reply_to        TEXT,
  segment_id      UUID,           -- NULL = all customers
  status          TEXT DEFAULT 'draft', -- 'draft'|'scheduled'|'sending'|'sent'|'failed'
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count      INTEGER DEFAULT 0,
  open_count      INTEGER DEFAULT 0,
  click_count     INTEGER DEFAULT 0,
  bounce_count    INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  template_id     TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_campaigns_store_idx ON public.email_campaigns(store_id, status, created_at DESC);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant manages own campaigns') THEN
    CREATE POLICY "Merchant manages own campaigns"
      ON public.email_campaigns FOR ALL
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ─────────────────────────────────────────
-- CRM CONTACTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),  -- link to buyer account if exists
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  tags            TEXT[] DEFAULT '{}',
  segment         TEXT,           -- 'vip'|'at_risk'|'new'|'loyal'|'inactive'
  total_orders    INTEGER DEFAULT 0,
  total_spent     NUMERIC(12,2) DEFAULT 0,
  avg_order_value NUMERIC(12,2) DEFAULT 0,
  last_order_at   TIMESTAMPTZ,
  first_order_at  TIMESTAMPTZ,
  notes           TEXT,
  is_subscribed   BOOLEAN DEFAULT TRUE,  -- email marketing opt-in
  is_blocked      BOOLEAN DEFAULT FALSE,
  custom_fields   JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, email)
);

CREATE INDEX IF NOT EXISTS crm_contacts_store_idx ON public.crm_contacts(store_id, segment, last_order_at DESC);
CREATE INDEX IF NOT EXISTS crm_contacts_email_idx ON public.crm_contacts(store_id, email);
CREATE INDEX IF NOT EXISTS crm_contacts_tags_gin  ON public.crm_contacts USING gin(tags);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant manages own contacts') THEN
    CREATE POLICY "Merchant manages own contacts"
      ON public.crm_contacts FOR ALL
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ─────────────────────────────────────────
-- CRM ACTIVITIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'order'|'email_sent'|'email_opened'|'note'|'call'|'refund'|'review'
  title       TEXT NOT NULL,
  body        TEXT,
  metadata    JSONB DEFAULT '{}',  -- { order_id, amount, email_id }
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_activities_contact_idx ON public.crm_activities(contact_id, created_at DESC);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant manages own activities') THEN
    CREATE POLICY "Merchant manages own activities"
      ON public.crm_activities FOR ALL
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ─────────────────────────────────────────
-- CRM SEGMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  conditions  JSONB NOT NULL DEFAULT '[]',  -- [{ field, operator, value }]
  contact_count INTEGER DEFAULT 0,
  is_dynamic  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant manages own segments') THEN
    CREATE POLICY "Merchant manages own segments"
      ON public.crm_segments FOR ALL
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ─────────────────────────────────────────
-- AUTO-SYNC: keep crm_contacts in sync with orders
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_crm_on_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If we don't have email, we can't sync to CRM properly via this method
  IF NEW.customer_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.crm_contacts (store_id, user_id, full_name, email, total_orders, total_spent, first_order_at, last_order_at)
  VALUES (
    NEW.store_id,
    NEW.customer_id,
    COALESCE(NEW.customer_name, 'Unknown'),
    NEW.customer_email,
    1,
    NEW.total_amount,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (store_id, email) 
  DO UPDATE SET
    total_orders    = crm_contacts.total_orders + 1,
    total_spent     = crm_contacts.total_spent + EXCLUDED.total_spent,
    avg_order_value = (crm_contacts.total_spent + EXCLUDED.total_spent) / (crm_contacts.total_orders + 1),
    last_order_at   = NEW.created_at,
    updated_at      = now();
  
  -- Log activity
  INSERT INTO public.crm_activities (store_id, contact_id, type, title, metadata)
  SELECT 
    NEW.store_id,
    id,
    'order',
    'Placed order #' || substring(NEW.id::text from 1 for 8),
    jsonb_build_object('order_id', NEW.id, 'amount', NEW.total_amount)
  FROM public.crm_contacts 
  WHERE store_id = NEW.store_id AND email = NEW.customer_email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_crm ON public.orders;
CREATE TRIGGER orders_sync_crm
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_crm_on_order();
