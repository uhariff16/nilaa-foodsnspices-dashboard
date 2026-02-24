CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    emp_id TEXT UNIQUE NOT NULL, -- e.g. NFS1001
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT, -- Designation
    department TEXT,
    joining_date DATE,
    address TEXT,
    emergency_contact TEXT,
    aadhar_no TEXT,
    bank_name TEXT,
    account_no TEXT,
    ifsc_code TEXT,
    hourly_rate NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Migration for existing tables
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ifsc_code TEXT;

-- Migration for existing employee_attendance table
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS regular_hours NUMERIC DEFAULT 0;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS ot_hours NUMERIC DEFAULT 0;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS rate NUMERIC DEFAULT 0;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS break_hours NUMERIC DEFAULT 0;

-- Ensure employee_attendance has the right schema
-- (If it doesn't already exist from previous work)
CREATE TABLE IF NOT EXISTS public.employee_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date DATE NOT NULL,
    emp_id TEXT NOT NULL,
    emp_name TEXT,
    shifts JSONB DEFAULT '[]'::jsonb, -- Array of {in, out}
    total_hours NUMERIC DEFAULT 0,
    daily_wage NUMERIC DEFAULT 0,
    regular_hours NUMERIC DEFAULT 0,
    ot_hours NUMERIC DEFAULT 0,
    rate NUMERIC DEFAULT 0,
    attendance_status TEXT DEFAULT 'Present', -- 'Present', 'Absent', 'Casual Leave', 'Medical Leave'
    leave_reason TEXT,
    UNIQUE(date, emp_id)
);

-- RLS Policies
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'employees') THEN
        CREATE POLICY "Public Read Access" ON public.employees FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Insert Access' AND tablename = 'employees') THEN
        CREATE POLICY "Admin Insert Access" ON public.employees FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Update Access' AND tablename = 'employees') THEN
        CREATE POLICY "Admin Update Access" ON public.employees FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Delete Access' AND tablename = 'employees') THEN
        CREATE POLICY "Admin Delete Access" ON public.employees FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'employee_attendance') THEN
        CREATE POLICY "Public Read Access" ON public.employee_attendance FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Insert Access' AND tablename = 'employee_attendance') THEN
        CREATE POLICY "Admin Insert Access" ON public.employee_attendance FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Update Access' AND tablename = 'employee_attendance') THEN
        CREATE POLICY "Admin Update Access" ON public.employee_attendance FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Delete Access' AND tablename = 'employee_attendance') THEN
        CREATE POLICY "Admin Delete Access" ON public.employee_attendance FOR DELETE USING (true);
    END IF;

    -- Add new columns to existing table
    ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'Present';
    ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS leave_reason TEXT;
END $$;

-- HR Master Data (Departments & Roles)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT UNIQUE NOT NULL
);

-- RLS for Master Data (Public Read, Admin Write)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Departments Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'departments') THEN
        CREATE POLICY "Public Read Access" ON public.departments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Write Access' AND tablename = 'departments') THEN
        CREATE POLICY "Admin Write Access" ON public.departments FOR ALL USING (true);
    END IF;

    -- Roles Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'roles') THEN
        CREATE POLICY "Public Read Access" ON public.roles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Write Access' AND tablename = 'roles') THEN
        CREATE POLICY "Admin Write Access" ON public.roles FOR ALL USING (true);
    END IF;
END $$;

-- Payroll Configuration (Global Settings)
CREATE TABLE IF NOT EXISTS public.payroll_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one row
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    standard_daily_hours NUMERIC DEFAULT 8,
    ot_multiplier NUMERIC DEFAULT 1.5,
    default_hourly_rate NUMERIC DEFAULT 100
);

-- Initialize default payroll config if not exists
INSERT INTO public.payroll_config (id, standard_daily_hours, ot_multiplier, default_hourly_rate)
VALUES (1, 8, 1.5, 100)
ON CONFLICT (id) DO NOTHING;

-- Policies for payroll_config
ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on payroll_config"
ON public.payroll_config FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow admin to update payroll_config"
ON public.payroll_config FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Migration for Deductions and Reason
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS deductions NUMERIC DEFAULT 0;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS deduction_reason TEXT;
