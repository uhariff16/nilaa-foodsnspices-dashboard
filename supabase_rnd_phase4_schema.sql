-- Phase 4: R&D Management Module - Analytics, Risk & Approvals Schema

-- 1. Risk Assessments
-- Tracks potential risks associated with a new product before commercialization.
CREATE TABLE rnd_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES rnd_projects(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,
    microbiological_risk TEXT, -- Low, Medium, High + comments
    physical_risk TEXT,
    chemical_risk TEXT,
    commercial_risk TEXT,
    overall_score INTEGER, -- 1-100 score based on risk matrix
    recommendation TEXT, -- Pass, Modify, Reject
    assessed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Approvals Workflow
-- Multi-stage digital sign-offs for formulation and commercialization.
CREATE TABLE rnd_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES rnd_projects(id) ON DELETE CASCADE,
    formula_version_id UUID REFERENCES rnd_formula_versions(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- 'R&D Preparation', 'QA Approval', 'Management Approval', 'Commercialization'
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    approver_name TEXT,
    notes TEXT,
    signature_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
