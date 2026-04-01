-- Create the invoice_discounts table
CREATE TABLE IF NOT EXISTS invoice_discounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_no TEXT NOT NULL,
    discount_amount NUMERIC NOT NULL,
    discount_date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invoice_discounts ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming similar to other tables)
CREATE POLICY "Enable read access for all users" ON invoice_discounts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON invoice_discounts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON invoice_discounts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON invoice_discounts FOR DELETE USING (auth.role() = 'authenticated');
