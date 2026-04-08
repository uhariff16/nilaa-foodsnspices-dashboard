-- 1. Profit Hub Audit Logs
CREATE TABLE IF NOT EXISTS profit_hub_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL, -- e.g., 'Status Update', 'System Reset', 'Reserve Override'
    details JSONB,       -- e.g., { "stakeholder": "Nassar", "month": "Jan 2026", "old": "pending", "new": "paid" }
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Monthly Reserve Settings (Overrides Global)
CREATE TABLE IF NOT EXISTS profit_monthly_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_year TEXT NOT NULL, -- e.g., "Jan 2026"
    reserve_percentage DECIMAL(5,2) NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(month_year)
);

-- Enable RLS (Assuming basic access for now)
ALTER TABLE profit_hub_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_monthly_settings ENABLE ROW LEVEL SECURITY;

-- Basic policies (Admin only for write, all auth for read)
CREATE POLICY "Admins can manage logs" ON profit_hub_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can read logs" ON profit_hub_logs FOR SELECT USING (
    auth.role() = 'authenticated'
);

CREATE POLICY "Admins can manage monthly settings" ON profit_monthly_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can read settings" ON profit_monthly_settings FOR SELECT USING (
    auth.role() = 'authenticated'
);
