-- 1. Add e-invoice details to stores table
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS tin TEXT,
  ADD COLUMN IF NOT EXISTS brn TEXT,
  ADD COLUMN IF NOT EXISTS msic_code TEXT DEFAULT '47910',
  ADD COLUMN IF NOT EXISTS business_activity_desc TEXT DEFAULT 'RETAIL SALE OF ANY KIND OF PRODUCT OVER THE INTERNET',
  ADD COLUMN IF NOT EXISTS invoice_email TEXT,
  ADD COLUMN IF NOT EXISTS invoice_phone TEXT,
  ADD COLUMN IF NOT EXISTS invoice_address TEXT,
  ADD COLUMN IF NOT EXISTS invoice_city TEXT,
  ADD COLUMN IF NOT EXISTS invoice_state_code TEXT DEFAULT '14', -- KL
  ADD COLUMN IF NOT EXISTS invoice_postcode TEXT;

-- 2. Core einvoices table
CREATE TABLE IF NOT EXISTS public.einvoices (
  id                  SERIAL PRIMARY KEY,
  order_id            UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number        TEXT UNIQUE NOT NULL, -- Human readable order ID or UUID as string
  invoice_type        TEXT  NOT NULL
                        CHECK (invoice_type IN (
                          'invoice','credit-note','debit-note',
                          'refund-note','consolidated'
                        )),
  lhdn_uuid           TEXT,
  lhdn_long_id        TEXT,
  qr_code_url         TEXT,
  submission_uid      TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending','valid','invalid',
                          'cancelled','rejected'
                        )),
  error_message       TEXT,
  submitted_at        TIMESTAMPTZ,
  validated_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_einvoices_order_number ON public.einvoices(order_number);
CREATE INDEX IF NOT EXISTS idx_einvoices_status       ON public.einvoices(status);
CREATE INDEX IF NOT EXISTS idx_einvoices_lhdn_uuid    ON public.einvoices(lhdn_uuid);

-- 3. Consolidated staging for B2C
CREATE TABLE IF NOT EXISTS public.consolidated_staging (
  id                      SERIAL PRIMARY KEY,
  order_id                UUID UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number            TEXT UNIQUE NOT NULL,
  subtotal                DECIMAL(12, 2) NOT NULL,
  tax                     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  year                    INT NOT NULL,
  month                   INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  consolidated_einvoice_id INT REFERENCES public.einvoices(id),
  staged_at               TIMESTAMPTZ DEFAULT NOW(),
  consolidated_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consolidated_staging_year_month ON public.consolidated_staging(year, month);
CREATE INDEX IF NOT EXISTS idx_consolidated_staging_unconsolidated 
  ON public.consolidated_staging(consolidated_einvoice_id)
  WHERE consolidated_einvoice_id IS NULL;

-- 4. Audit Log
CREATE TABLE IF NOT EXISTS public.einvoice_audit_log (
  id            SERIAL PRIMARY KEY,
  order_number  TEXT,
  action        TEXT NOT NULL,
  endpoint      TEXT,
  request_body  JSONB,
  response_body JSONB,
  status_code   INT,
  duration_ms   INT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_order_number ON public.einvoice_audit_log(order_number);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON public.einvoice_audit_log(created_at);

-- 5. Failed Jobs (DLQ)
CREATE TABLE IF NOT EXISTS public.failed_invoice_jobs (
  id           SERIAL PRIMARY KEY,
  job_id       TEXT,
  job_type     TEXT,
  order_number TEXT,
  error        TEXT,
  attempts     INT DEFAULT 0,
  payload      JSONB,
  failed_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved     BOOLEAN DEFAULT FALSE,
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_jobs_unresolved ON public.failed_invoice_jobs(resolved) WHERE resolved = FALSE;

-- 6. Trigger for updated_at
CREATE TRIGGER trg_einvoices_updated_at
  BEFORE UPDATE ON public.einvoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. RLS Policies
ALTER TABLE public.einvoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all einvoices" ON public.einvoices FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Store owners can view their einvoices" ON public.einvoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_store_owner(o.store_id))
);

ALTER TABLE public.consolidated_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage consolidated_staging" ON public.consolidated_staging FOR ALL USING (public.get_user_role() = 'admin');

ALTER TABLE public.einvoice_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.einvoice_audit_log FOR SELECT USING (public.get_user_role() = 'admin');

ALTER TABLE public.failed_invoice_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage failed jobs" ON public.failed_invoice_jobs FOR ALL USING (public.get_user_role() = 'admin');
