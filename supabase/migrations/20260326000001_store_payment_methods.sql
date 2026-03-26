-- Add boolean flags to stores table for payment method selection
ALTER TABLE "public"."stores"
  ADD COLUMN "accepts_razorpay" boolean DEFAULT true,
  ADD COLUMN "accepts_billplz" boolean DEFAULT true;
