-- Supabase Migration: Add Warranty Expiry and Company Details to Business Assets
-- Run this script in the Supabase SQL Editor to update your table structure.

-- 1. Add new columns for warranty expiry date and company details
ALTER TABLE public.business_assets 
ADD COLUMN IF NOT EXISTS warranty_expiry_date DATE,
ADD COLUMN IF NOT EXISTS company_details TEXT;

-- 2. Backfill existing assets: Default to a 1-year warranty from the purchase date
UPDATE public.business_assets 
SET warranty_expiry_date = (purchase_date + INTERVAL '1 year')::DATE 
WHERE warranty_expiry_date IS NULL;
