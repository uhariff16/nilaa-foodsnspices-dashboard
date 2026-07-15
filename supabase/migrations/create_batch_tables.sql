-- Migration: Create Batch Management Tables for Nilaa ERP

-- 1. Recipe Versions
CREATE TABLE IF NOT EXISTS recipe_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT NOT NULL,
    version_label TEXT NOT NULL,
    ingredients_list JSONB NOT NULL, -- e.g., [{"item": "ginger", "qty_kg": 1.0}]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Batch Master
CREATE TABLE IF NOT EXISTS batch_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT UNIQUE NOT NULL,
    product_code TEXT NOT NULL,
    manufacturing_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    packaging_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    shelf_life_days INTEGER DEFAULT 180,
    recipe_version_id UUID REFERENCES recipe_versions(id) ON DELETE SET NULL,
    machine_id TEXT,
    shift TEXT,
    operator_name TEXT,
    supervisor_name TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, In Production, Completed, Released, Blocked, Expired, Disposed
    quality_status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Passed, Rejected, Hold
    expected_output_kg NUMERIC(10,2) DEFAULT 0.0,
    actual_output_kg NUMERIC(10,2) DEFAULT 0.0,
    processing_loss_kg NUMERIC(10,2) DEFAULT 0.0,
    water_loss_kg NUMERIC(10,2) DEFAULT 0.0,
    yield_pct NUMERIC(5,2) DEFAULT 0.0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast batch lookup
CREATE INDEX IF NOT EXISTS idx_batch_master_number ON batch_master(batch_number);

-- 3. Raw Material Supplier Batches
CREATE TABLE IF NOT EXISTS raw_material_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_batch_number TEXT UNIQUE NOT NULL,
    supplier_batch_number TEXT,
    item_name TEXT NOT NULL,
    supplier_name TEXT,
    initial_qty NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    current_qty NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    warehouse TEXT,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rm_batches_internal ON raw_material_batches(internal_batch_number);

-- 4. Batch Raw Material Consumption Link Table
CREATE TABLE IF NOT EXISTS batch_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finished_batch_id UUID REFERENCES batch_master(id) ON DELETE CASCADE,
    rm_batch_id UUID REFERENCES raw_material_batches(id) ON DELETE CASCADE,
    consumed_qty NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Packaging Transactions
CREATE TABLE IF NOT EXISTS packaging_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batch_master(id) ON DELETE CASCADE,
    pack_size TEXT NOT NULL, -- 250g, 500g, 1kg, 5kg, Bulk (Loose)
    channel TEXT NOT NULL, -- Retail, Wholesale
    packet_count INTEGER NOT NULL DEFAULT 0,
    total_volume_kg NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    mrp NUMERIC(10,2) DEFAULT 0.0,
    barcode TEXT,
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Batch Quality Inspections
CREATE TABLE IF NOT EXISTS batch_quality_inspection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batch_master(id) ON DELETE CASCADE,
    inspector_name TEXT,
    parameter_status JSONB, -- sensory checks (smell, color, taste), physical checks
    final_decision TEXT NOT NULL DEFAULT 'Pending', -- Passed, Rejected, Hold
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    remarks TEXT
);

-- 7. Batch-wise Inventory Table
CREATE TABLE IF NOT EXISTS batch_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL,
    item_name TEXT NOT NULL,
    pack_size TEXT NOT NULL, -- e.g. 250g, 500g, Raw, Bulk
    qty NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    location TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_inv_composite ON batch_inventory(batch_number, item_name, pack_size);

-- Disable Row Level Security (RLS) on all Batch tables to allow direct client queries
ALTER TABLE recipe_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_consumption DISABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_quality_inspection DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_inventory DISABLE ROW LEVEL SECURITY;
