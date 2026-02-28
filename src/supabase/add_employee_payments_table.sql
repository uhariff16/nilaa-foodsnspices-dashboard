-- Create employee_payments table
CREATE TABLE IF NOT EXISTS public.employee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date DATE NOT NULL,
    emp_id TEXT NOT NULL,
    emp_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('Salary', 'Advance', 'Wages')),
    amount NUMERIC NOT NULL DEFAULT 0,
    remarks TEXT
);

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_employee_payments_date ON public.employee_payments(date);
CREATE INDEX IF NOT EXISTS idx_employee_payments_emp_id ON public.employee_payments(emp_id);

-- Enable RLS
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

-- Policies (matching existing patterns in the project)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'employee_payments') THEN
        CREATE POLICY "Public Read Access" ON public.employee_payments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Insert Access' AND tablename = 'employee_payments') THEN
        CREATE POLICY "Admin Insert Access" ON public.employee_payments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Update Access' AND tablename = 'employee_payments') THEN
        CREATE POLICY "Admin Update Access" ON public.employee_payments FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Delete Access' AND tablename = 'employee_payments') THEN
        CREATE POLICY "Admin Delete Access" ON public.employee_payments FOR DELETE USING (true);
    END IF;
END $$;
