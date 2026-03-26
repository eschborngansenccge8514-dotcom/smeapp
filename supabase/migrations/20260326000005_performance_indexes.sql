-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS — most frequently queried columns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_store_available_idx
  ON products(store_id, is_available, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_store_category_idx
  ON products(store_id, category, is_available);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_store_bestseller_idx
  ON products(store_id, is_bestseller, rating DESC NULLS LAST)
  WHERE is_available = TRUE;

-- Full text search on product name + description
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_fts_idx
  ON products
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '')));

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_store_status_created_idx
  ON orders(store_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_user_idx
  ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_store_completed_idx
  ON orders(store_id, created_at DESC)
  WHERE status = 'completed';

-- ─────────────────────────────────────────────────────────────────────────────
-- STORES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  stores_slug_idx ON stores(slug);

-- Geospatial index for nearby store lookups (if location exists)
-- Note: Check if location column exists before running this in production
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS
--   stores_location_idx
--   ON stores USING gist(location)
--   WHERE location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  notif_store_unread_idx
  ON merchant_notifications(store_id, is_read, created_at DESC)
  WHERE is_archived = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- CRM
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  crm_contacts_email_store_idx
  ON crm_contacts(store_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  crm_contacts_segment_spent_idx
  ON crm_contacts(store_id, segment, total_spent DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  crm_activities_contact_id_time_idx
  ON crm_activities(contact_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS PERFORMANCE: avoid sequential scans by indexing auth.uid() lookups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  stores_owner_id_idx ON stores(owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_user_store_id_idx ON orders(user_id, store_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MATERIALISED VIEW: dashboard stats (refreshed by cron every 5 min)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_store_stats AS
SELECT
  o.store_id,
  COUNT(DISTINCT o.id)                          AS total_orders,
  COUNT(DISTINCT o.id) FILTER (
    WHERE o.created_at >= CURRENT_DATE
  )                                             AS orders_today,
  COALESCE(SUM(o.total) FILTER (
    WHERE o.status = 'completed'
    AND o.created_at >= NOW() - INTERVAL '30 days'
  ), 0)                                         AS revenue_30d,
  COUNT(DISTINCT o.user_id)                     AS unique_customers,
  COALESCE(AVG(o.total) FILTER (
    WHERE o.status = 'completed'
  ), 0)                                         AS avg_order_value
FROM orders o
GROUP BY o.store_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_store_stats_store_id_idx ON mv_store_stats(store_id);

-- Auto-refresh via pg_cron (requires pg_cron extension)
-- Note: This might fail if pg_cron is not enabled.
-- SELECT cron.schedule(
--   'refresh-store-stats',
--   '*/5 * * * *',
--   $REFRESH MATERIALIZED VIEW CONCURRENTLY mv_store_stats$
-- );
