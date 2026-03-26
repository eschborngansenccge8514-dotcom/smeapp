-- ── Persisted carts (for logged-in users, survives tab close) ─────────────────
CREATE TABLE IF NOT EXISTS public.carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)    -- one cart per user per store, always
);

CREATE INDEX IF NOT EXISTS carts_user_store_idx
  ON public.carts(user_id, store_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Users can only ever see and modify their OWN cart for the current store
CREATE POLICY "cart_owner_only" ON public.carts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_cart_updated
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION update_cart_timestamp();
