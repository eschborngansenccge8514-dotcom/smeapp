ALTER TABLE "public"."stores"
  ADD COLUMN "accepts_manual_payment" boolean DEFAULT false,
  ADD COLUMN "manual_payment_instructions" text;

-- Add payment method to orders
ALTER TABLE "public"."orders"
  ADD COLUMN "payment_method" text DEFAULT 'billplz';
