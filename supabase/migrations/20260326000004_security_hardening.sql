-- 1. Convert views to SECURITY INVOKER
-- merchant_daily_revenue
DROP VIEW IF EXISTS public.merchant_daily_revenue;
CREATE VIEW public.merchant_daily_revenue WITH (security_invoker = true) AS
SELECT o.store_id,
    date((o.created_at AT TIME ZONE 'Asia/Kuala_Lumpur'::text)) AS date,
    count(*) FILTER (WHERE (o.status = 'delivered'::order_status)) AS completed_orders,
    COALESCE(sum(o.total_amount) FILTER (WHERE (o.status = 'delivered'::order_status)), (0)::numeric) AS gross_revenue,
    COALESCE(sum((o.total_amount * 0.10)) FILTER (WHERE (o.status = 'delivered'::order_status)), (0)::numeric) AS commission,
    COALESCE(sum((o.total_amount * 0.90)) FILTER (WHERE (o.status = 'delivered'::order_status)), (0)::numeric) AS net_revenue,
    count(DISTINCT o.customer_id) AS unique_customers
FROM public.orders o
GROUP BY o.store_id, (date((o.created_at AT TIME ZONE 'Asia/Kuala_Lumpur'::text)));

-- merchant_top_products
DROP VIEW IF EXISTS public.merchant_top_products;
CREATE VIEW public.merchant_top_products WITH (security_invoker = true) AS
SELECT p.store_id,
    p.id AS product_id,
    p.name,
    p.price,
    p.image_urls[1] AS image_url,
    count(oi.id) AS times_ordered,
    COALESCE(sum(oi.quantity), (0)::bigint) AS total_units_sold,
    COALESCE(sum(((oi.quantity)::numeric * oi.unit_price)), (0)::numeric) AS total_revenue
FROM ((public.products p
    LEFT JOIN public.order_items oi ON ((oi.product_id = p.id)))
    LEFT JOIN public.orders o ON (((o.id = oi.order_id) AND (o.status = 'delivered'::order_status))))
GROUP BY p.store_id, p.id, p.name, p.price, p.image_urls;

-- admin_kpi_summary
DROP VIEW IF EXISTS public.admin_kpi_summary;
CREATE VIEW public.admin_kpi_summary WITH (security_invoker = true) AS
SELECT ( SELECT count(*) AS count
           FROM orders
          WHERE (orders.status = 'delivered'::order_status)) AS total_orders_completed,
    ( SELECT count(*) AS count
           FROM orders
          WHERE ((orders.status = 'pending'::order_status) OR (orders.status = 'confirmed'::order_status) OR (orders.status = 'preparing'::order_status))) AS orders_in_progress,
    ( SELECT COALESCE(sum(orders.total_amount), (0)::numeric) AS "coalesce"
           FROM orders
          WHERE (orders.status = 'delivered'::order_status)) AS total_gross_revenue,
    ( SELECT COALESCE(sum((orders.total_amount * 0.02)), (0)::numeric) AS "coalesce"
           FROM orders
          WHERE (orders.status = 'delivered'::order_status)) AS total_platform_fees,
    ( SELECT count(*) AS count
           FROM stores
          WHERE (stores.is_active = true)) AS active_stores,
    ( SELECT count(*) AS count
           FROM stores
          WHERE (stores.is_active = false)) AS pending_store_approvals,
    ( SELECT count(*) AS count
           FROM profiles
          WHERE (profiles.role = 'customer'::user_role)) AS total_customers,
    ( SELECT count(*) AS count
           FROM profiles
          WHERE (profiles.role = 'merchant'::user_role)) AS total_merchants,
    ( SELECT count(*) AS count
           FROM disputes
          WHERE (disputes.status = 'open'::text)) AS open_disputes,
    ( SELECT count(*) AS count
           FROM orders
          WHERE ((orders.status = 'delivered'::order_status) AND (orders.created_at >= (now() - '24:00:00'::interval)))) AS orders_last_24h,
    ( SELECT COALESCE(sum(orders.total_amount), (0)::numeric) AS "coalesce"
           FROM orders
          WHERE ((orders.status = 'delivered'::order_status) AND (orders.created_at >= (now() - '24:00:00'::interval)))) AS revenue_last_24h;

-- 2. Enable RLS and add policies for tables
-- product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Store owners can manage their product images" ON public.product_images;
CREATE POLICY "Store owners can manage their product images"
ON public.product_images FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND is_store_owner(p.store_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND is_store_owner(p.store_id)
  )
);

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view announcements" ON public.announcements;
CREATE POLICY "Users can view announcements"
ON public.announcements FOR SELECT
TO public
USING (
  target_role IS NULL OR 
  target_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- migration completed (spatial_ref_sys skipped due to being a system table)
