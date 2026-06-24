-- Add partnership_percentage column to partner_investments table
ALTER TABLE public.partner_investments 
ADD COLUMN IF NOT EXISTS partnership_percentage NUMERIC DEFAULT 0;
