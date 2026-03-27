-- Migration: Add national_holidays to payroll_config
ALTER TABLE public.payroll_config ADD COLUMN IF NOT EXISTS national_holidays JSONB DEFAULT '[]'::jsonb;
