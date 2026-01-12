-- ============================================
-- LIGHTHOUSE FRANCE - DATABASE UPDATE FOR V2
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add RMA number column to service_requests
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS rma_number TEXT UNIQUE;

-- 2. Add timestamps
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 3. Create RMA counter if not exists
INSERT INTO system_settings (key, value) 
VALUES ('rma_counter', '{"prefix": "FR", "counter": 340}')
ON CONFLICT (key) DO NOTHING;

-- 4. Create index for RMA number
CREATE INDEX IF NOT EXISTS idx_service_requests_rma ON service_requests(rma_number);

-- 5. Ensure all permissions are correct
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
GRANT ALL ON service_requests TO authenticated;
GRANT ALL ON system_settings TO authenticated;

SELECT 'Database updated for v2! ✅' as message;
