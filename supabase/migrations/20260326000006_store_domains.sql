-- ── Add domain fields to stores ───────────────────────────────────────────────
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain        TEXT   UNIQUE,
  ADD COLUMN IF NOT EXISTS domain_verified      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS domain_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subdomain_active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS domain_txt_record    TEXT,   -- for DNS verification
  ADD COLUMN IF NOT EXISTS font_family          TEXT;   -- for store branding

-- Ensure slug is unique and URL-safe
-- This might already exist, so we use DO block or separate ALTER
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stores_slug_format') THEN
        ALTER TABLE public.stores
          ADD CONSTRAINT stores_slug_format
          CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS stores_custom_domain_idx
  ON public.stores(custom_domain)
  WHERE custom_domain IS NOT NULL AND domain_verified = TRUE;

CREATE INDEX IF NOT EXISTS stores_slug_active_idx
  ON public.stores(slug, is_active);

-- Update RLS: Ensure public can read basic store info for domain resolution
-- We'll use the existing RLS structure but ensure it allows what we need.
-- Most stores already have RLS enabled. Let's check for existing policies.

CREATE POLICY "stores_public_domain_read" ON public.stores
  FOR SELECT USING (
    is_active = true AND (
      subdomain_active = true OR
      (custom_domain IS NOT NULL AND domain_verified = true)
    )
  );
