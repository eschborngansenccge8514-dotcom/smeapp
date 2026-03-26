-- Add bank details to stores table for payouts
ALTER TABLE "public"."stores"
  ADD COLUMN "bank_name" text,
  ADD COLUMN "bank_account_number" text,
  ADD COLUMN "bank_account_holder_name" text;
