ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.transaction_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    invoice_no TEXT NOT NULL,
    item_name TEXT,
    transaction_type TEXT NOT NULL DEFAULT 'Sales',
    amendment_type TEXT NOT NULL DEFAULT 'value_change',
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    amount_delta NUMERIC DEFAULT 0,
    source_file TEXT,
    status TEXT NOT NULL DEFAULT 'pending_acknowledgment',
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_amendments_status ON public.transaction_amendments(status);
CREATE INDEX IF NOT EXISTS idx_transaction_amendments_invoice ON public.transaction_amendments(invoice_no);
CREATE INDEX IF NOT EXISTS idx_transaction_amendments_txn_id ON public.transaction_amendments(transaction_id);

ALTER TABLE public.transaction_amendments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transaction_amendments' AND policyname = 'Allow public read access to transaction_amendments'
    ) THEN
        CREATE POLICY "Allow public read access to transaction_amendments" ON public.transaction_amendments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transaction_amendments' AND policyname = 'Allow public insert access to transaction_amendments'
    ) THEN
        CREATE POLICY "Allow public insert access to transaction_amendments" ON public.transaction_amendments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transaction_amendments' AND policyname = 'Allow public update access to transaction_amendments'
    ) THEN
        CREATE POLICY "Allow public update access to transaction_amendments" ON public.transaction_amendments FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transaction_amendments' AND policyname = 'Allow public delete access to transaction_amendments'
    ) THEN
        CREATE POLICY "Allow public delete access to transaction_amendments" ON public.transaction_amendments FOR DELETE USING (true);
    END IF;
END $$;
