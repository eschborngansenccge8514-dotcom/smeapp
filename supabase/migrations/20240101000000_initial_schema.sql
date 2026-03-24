-- 1. Extensions & Enums
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE public.user_role AS ENUM ('customer', 'merchant', 'admin');
CREATE TYPE public.order_status AS ENUM (
  'pending', 'confirmed', 'preparing',
  'ready', 'dispatched', 'delivered', 'cancelled'
);
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.delivery_type AS ENUM ('lalamove', 'easyparcel', 'pickup');

-- 2. Tables
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          public.user_role NOT NULL DEFAULT 'customer',
  full_name     TEXT,
  phone         TEXT,
  push_token    TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stores (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  category             TEXT,
  address              TEXT,
  lat                  DOUBLE PRECISION,
  lng                  DOUBLE PRECISION,
  location             GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                         CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
                           THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY
                         END
                       ) STORED,
  is_active            BOOLEAN NOT NULL DEFAULT false,
  logo_url             TEXT,
  brand_primary_color  TEXT DEFAULT '#6366F1',
  brand_subdomain      TEXT UNIQUE,
  brand_custom_domain  TEXT UNIQUE,
  brand_app_name       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_owner_id    ON public.stores(owner_id);
CREATE INDEX idx_stores_location    ON public.stores USING GIST(location);
CREATE INDEX idx_stores_subdomain   ON public.stores(brand_subdomain);
CREATE INDEX idx_stores_custom_domain ON public.stores(brand_custom_domain);

CREATE TABLE public.products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock_qty    INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store_id ON public.products(store_id);

CREATE TABLE public.orders (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id            UUID NOT NULL REFERENCES public.profiles(id),
  store_id               UUID NOT NULL REFERENCES public.stores(id),
  status                 public.order_status NOT NULL DEFAULT 'pending',
  delivery_type          public.delivery_type,
  delivery_fee           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_address       TEXT,
  delivery_lat           DOUBLE PRECISION,
  delivery_lng           DOUBLE PRECISION,
  total_amount           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tracking_number        TEXT,
  lalamove_order_id      TEXT,
  lalamove_quotation_id  TEXT,
  selected_courier_id    TEXT,
  delivery_provider      TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_store_id    ON public.orders(store_id);
CREATE INDEX idx_orders_status      ON public.orders(status);

CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

CREATE TABLE public.payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_order_id    TEXT UNIQUE,
  razorpay_payment_id  TEXT UNIQUE,
  status               public.payment_status NOT NULL DEFAULT 'pending',
  amount               INTEGER NOT NULL,    -- in sen (RM × 100)
  currency             TEXT NOT NULL DEFAULT 'MYR',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- 3. updated_at Auto-Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','stores','products','orders','payments']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- 4. Auto-Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner(store_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = store_id AND owner_id = auth.uid()
  );
$$;

-- 6. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (get_user_role() = 'admin');

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active stores" ON public.stores FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "Merchants can create their own store" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id AND get_user_role() = 'merchant');
CREATE POLICY "Merchants can update their own store" ON public.stores FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins can update any store" ON public.stores FOR UPDATE USING (get_user_role() = 'admin');

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available products" ON public.products FOR SELECT USING (is_available = true OR is_store_owner(store_id) OR get_user_role() = 'admin');
CREATE POLICY "Store owners can insert products" ON public.products FOR INSERT WITH CHECK (is_store_owner(store_id));
CREATE POLICY "Store owners can update products" ON public.products FOR UPDATE USING (is_store_owner(store_id));
CREATE POLICY "Store owners can delete products" ON public.products FOR DELETE USING (is_store_owner(store_id));

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Store owners can view their store orders" ON public.orders FOR SELECT USING (is_store_owner(store_id));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Store owners can update their order status" ON public.orders FOR UPDATE USING (is_store_owner(store_id));

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR is_store_owner(o.store_id))));
CREATE POLICY "Customers can insert order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own payments" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Store owners can view their payments" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND is_store_owner(o.store_id)));
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Service role can manage payments" ON public.payments FOR ALL USING (auth.role() = 'service_role');

-- 7. PostGIS Nearby Stores Function
CREATE OR REPLACE FUNCTION public.get_nearby_stores(
  user_lat   DOUBLE PRECISION,
  user_lng   DOUBLE PRECISION,
  radius_km  DOUBLE PRECISION DEFAULT 10,
  max_count  INTEGER DEFAULT 20
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  description         TEXT,
  category            TEXT,
  address             TEXT,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  logo_url            TEXT,
  brand_primary_color TEXT,
  brand_subdomain     TEXT,
  distance_km         DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    s.id,
    s.name,
    s.description,
    s.category,
    s.address,
    s.lat,
    s.lng,
    s.logo_url,
    s.brand_primary_color,
    s.brand_subdomain,
    ROUND(
      (ST_Distance(
        s.location,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY
      ) / 1000)::NUMERIC, 2
    )::DOUBLE PRECISION AS distance_km
  FROM public.stores s
  WHERE
    s.is_active = true
    AND s.location IS NOT NULL
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_count;
$$;

-- 8. Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('store-logos',    'store-logos',    true, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('avatars',        'avatars',        true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- NOTE: These might fail if the bucket policies already exist with the same name.
-- Using DO block to handle potential existing policies if necessary, but here we just try to create them.
DO $$
BEGIN
    -- Product images
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view product images') THEN
        CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can upload product images') THEN
        CREATE POLICY "Store owners can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
    END IF;

    -- Store logos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view store logos') THEN
        CREATE POLICY "Anyone can view store logos" ON storage.objects FOR SELECT USING (bucket_id = 'store-logos');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can upload store logos') THEN
        CREATE POLICY "Store owners can upload store logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);
    END IF;

    -- Avatars
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own avatars') THEN
        CREATE POLICY "Users can manage own avatars" ON storage.objects FOR ALL USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
    END IF;
END
$$;
