
-- Include Bonus Payout columns in Time & Attendance
-- Run this in the Supabase SQL Editor

-- 1. Add bonus columns to employee_attendance for per-day bonuses
ALTER TABLE public.employee_attendance 
ADD COLUMN IF NOT EXISTS bonus NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_reason TEXT;

-- 2. Update employee_payments to include 'Bonus' as a type (if restricted by enum, otherwise logic handles it)
-- Note: Logic in the app already supports custom types like 'Bonus' in the Register Payment form.
