-- Migration: Add Deletion Status and Remarks to employee_attendance
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS deletion_status TEXT DEFAULT 'Approved';
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS deletion_remarks TEXT;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS requested_by TEXT;

-- Update existing records to 'Approved' status
UPDATE public.employee_attendance SET deletion_status = 'Approved' WHERE deletion_status IS NULL;
