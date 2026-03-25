-- supabase/migrations/20241029_electronics_columns.sql

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gallery_urls         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS variants             JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_options      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS specs                JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quick_specs          TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS model_number         TEXT,
  ADD COLUMN IF NOT EXISTS warranty_months      INTEGER,
  ADD COLUMN IF NOT EXISTS is_official_warranty BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_new_arrival       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_bestseller        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_on_promotion      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promotion_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS promotion_label      TEXT,
  ADD COLUMN IF NOT EXISTS is_refurbished       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refurbished_grade    CHAR(1) CHECK (refurbished_grade IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS rating               NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_box_items         TEXT[] DEFAULT '{}';

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS is_official_store    BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS products_brand_idx
  ON products(store_id, brand);
CREATE INDEX IF NOT EXISTS products_specs_gin_idx
  ON products USING gin(specs);
CREATE INDEX IF NOT EXISTS products_rating_idx
  ON products(store_id, rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS products_promo_idx
  ON products(store_id, is_on_promotion) WHERE is_on_promotion = TRUE;
CREATE INDEX IF NOT EXISTS products_refurbished_idx
  ON products(store_id, is_refurbished, refurbished_grade);
