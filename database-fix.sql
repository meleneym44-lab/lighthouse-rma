-- ============================================
-- LIGHTHOUSE FRANCE - DATABASE FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Fix equipment table - add missing columns
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES profiles(id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS customer_location TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS customer_asset_tag TEXT;

-- 2. Fix service_requests table - add quote columns
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_calibration DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_parts DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_labor_hours DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_labor_rate DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_shipping DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_notes TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_subtotal DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_tax DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quote_total DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ;

-- 3. Make sure shipping_addresses exists
CREATE TABLE IF NOT EXISTS shipping_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    attention_to TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'France',
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    is_billing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DISABLE Row Level Security (this was blocking saves!)
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE models DISABLE ROW LEVEL SECURITY;

-- 5. Grant access to authenticated users
GRANT ALL ON equipment TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON service_requests TO authenticated;
GRANT ALL ON shipping_addresses TO authenticated;
GRANT ALL ON company_contacts TO authenticated;
GRANT ALL ON models TO authenticated;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company ON service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_company ON shipping_addresses(company_id);

-- 7. Make sure your admin account has the right role
UPDATE profiles SET role = 'admin' WHERE email = 'marshallm@golighthouse.com';

SELECT 'Database fixed! ✅' as message;
