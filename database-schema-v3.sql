-- =====================================================
-- LIGHTHOUSE FRANCE RMA PORTAL - DATABASE SCHEMA v3
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- CORE TABLES (if not exists)
-- =====================================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_number TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'France',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'technician', 'customer')),
  company_id UUID REFERENCES companies(id),
  email_notifications BOOLEAN DEFAULT true,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  serial_number TEXT NOT NULL,
  model_name TEXT,
  equipment_type TEXT DEFAULT 'particle_counter' CHECK (equipment_type IN ('particle_counter', 'biocollector', 'liquid_counter', 'microbial_sampler', 'sensor', 'other')),
  customer_location TEXT,
  last_calibration_date DATE,
  next_calibration_due DATE,
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(serial_number)
);

-- Shipping addresses
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  label TEXT NOT NULL,
  attention_to TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'France',
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTS MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'part' CHECK (category IN ('part', 'service', 'calibration', 'shipping')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default services/parts
INSERT INTO parts (reference, name, category, price) VALUES
  ('CAL-STD', 'Étalonnage Standard', 'calibration', 320),
  ('CAL-APEX-P', 'Étalonnage Apex P3/P5', 'calibration', 870),
  ('CAL-APEX-Z3', 'Étalonnage Apex Z3', 'calibration', 870),
  ('CAL-APEX-Z50', 'Étalonnage Apex Z50', 'calibration', 920),
  ('CAL-HANDILAZ', 'Étalonnage HandiLaz', 'calibration', 600),
  ('CAL-SOLAIR', 'Étalonnage Solair', 'calibration', 870),
  ('CAL-LS', 'Étalonnage LS-20/LS-60', 'calibration', 1200),
  ('SVC-CLEAN-CELL', 'Nettoyage Cellule', 'service', 100),
  ('SVC-CLEAN-LD', 'Nettoyage LD Sensor', 'service', 200),
  ('SVC-DIAG', 'Diagnostic', 'service', 75),
  ('SVC-LABOR', 'Main d''œuvre (heure)', 'service', 100),
  ('SVC-SHIP', 'Frais de Port', 'shipping', 40)
ON CONFLICT (reference) DO NOTHING;

-- =====================================================
-- SERVICE REQUESTS (MAIN RMA TABLE)
-- =====================================================

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  rma_number TEXT UNIQUE,
  company_id UUID REFERENCES companies(id) NOT NULL,
  submitted_by UUID REFERENCES profiles(id),
  
  -- Status tracking
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'quoted', 'approved', 'received', 'in_progress', 'completed', 'shipped', 'rejected', 'cancelled')),
  
  -- Request details
  requested_service TEXT DEFAULT 'calibration' CHECK (requested_service IN ('calibration', 'repair', 'diagnostic', 'calibration_repair')),
  problem_description TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'critical')),
  
  -- Quote fields
  quote_subtotal DECIMAL(10,2),
  quote_tax DECIMAL(10,2),
  quote_total DECIMAL(10,2),
  quote_notes TEXT,
  quoted_at TIMESTAMPTZ,
  quoted_by UUID REFERENCES profiles(id),
  
  -- Approval tracking
  approval_method TEXT CHECK (approval_method IN ('contract', 'electronic_signature', 'bon_commande_upload', 'manual_override')),
  approved_at TIMESTAMPTZ,
  approved_by_client TEXT,
  approval_ip TEXT,
  signature_data TEXT,
  bon_commande_file TEXT,
  
  -- Contract reference (if applicable)
  contract_id UUID,
  contract_applied BOOLEAN DEFAULT false,
  
  -- Shipping
  shipping_address_id UUID REFERENCES shipping_addresses(id),
  return_tracking_number TEXT,
  return_carrier TEXT DEFAULT 'UPS',
  
  -- Timestamps for workflow
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  
  -- Internal notes (staff only)
  internal_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REQUEST DEVICES (MULTIPLE DEVICES PER REQUEST)
-- =====================================================

CREATE TABLE IF NOT EXISTS request_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipment(id),
  serial_number TEXT NOT NULL,
  model_name TEXT,
  equipment_type TEXT,
  
  -- Service for this specific device
  service_type TEXT DEFAULT 'calibration',
  
  -- Pricing for this device
  line_price DECIMAL(10,2),
  
  -- Contract info for this device
  contract_id UUID,
  contract_price DECIMAL(10,2),
  contract_token_used BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- QUOTE LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  request_device_id UUID REFERENCES request_devices(id),
  part_id UUID REFERENCES parts(id),
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTRACTS MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  serial_number TEXT NOT NULL,
  model_name TEXT,
  
  -- Pricing
  contract_price DECIMAL(10,2) NOT NULL,
  
  -- Token system
  calibrations_allowed INT DEFAULT 1,
  calibrations_used INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(contract_id, serial_number)
);

-- Track each token usage
CREATE TABLE IF NOT EXISTS contract_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_device_id UUID REFERENCES contract_devices(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES service_requests(id),
  rma_number TEXT,
  
  used_at TIMESTAMPTZ DEFAULT NOW(),
  used_by UUID REFERENCES profiles(id),
  price_applied DECIMAL(10,2)
);

-- =====================================================
-- WORK LOG / TIMELINE
-- =====================================================

CREATE TABLE IF NOT EXISTS request_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  
  action TEXT NOT NULL,
  description TEXT,
  
  old_status TEXT,
  new_status TEXT,
  
  created_by UUID REFERENCES profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOCUMENTS STORAGE
-- =====================================================

CREATE TABLE IF NOT EXISTS request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'bon_commande', 'photo', 'report', 'calibration_cert', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_by_name TEXT,
  is_client_visible BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CALIBRATION REMINDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS calibration_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  
  due_date DATE NOT NULL,
  reminder_sent_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'dismissed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize RMA counter
INSERT INTO system_settings (key, value) VALUES 
  ('rma_counter', '{"prefix": "FR", "counter": 340}'),
  ('request_counter', '{"prefix": "SR", "counter": 1}')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_equipment_serial ON equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_requests_company ON service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_rma ON service_requests(rma_number);
CREATE INDEX IF NOT EXISTS idx_request_devices_serial ON request_devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_year ON contracts(year);
CREATE INDEX IF NOT EXISTS idx_contract_devices_serial ON contract_devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_timeline_request ON request_timeline(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_request ON request_documents(request_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate next RMA number
CREATE OR REPLACE FUNCTION generate_rma_number()
RETURNS TEXT AS $$
DECLARE
  current_counter INT;
  new_rma TEXT;
BEGIN
  SELECT (value->>'counter')::INT INTO current_counter 
  FROM system_settings WHERE key = 'rma_counter';
  
  new_rma := 'FR-' || LPAD((current_counter + 1)::TEXT, 5, '0');
  
  UPDATE system_settings 
  SET value = jsonb_build_object('prefix', 'FR', 'counter', current_counter + 1),
      updated_at = NOW()
  WHERE key = 'rma_counter';
  
  RETURN new_rma;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
  current_counter INT;
  new_request TEXT;
BEGIN
  SELECT (value->>'counter')::INT INTO current_counter 
  FROM system_settings WHERE key = 'request_counter';
  
  new_request := 'SR-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD((current_counter + 1)::TEXT, 4, '0');
  
  UPDATE system_settings 
  SET value = jsonb_build_object('prefix', 'SR', 'counter', current_counter + 1),
      updated_at = NOW()
  WHERE key = 'request_counter';
  
  RETURN new_request;
END;
$$ LANGUAGE plpgsql;

-- Function to check contract availability
CREATE OR REPLACE FUNCTION check_contract_availability(
  p_serial_number TEXT,
  p_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT
)
RETURNS TABLE (
  contract_id UUID,
  contract_number TEXT,
  company_name TEXT,
  contract_price DECIMAL,
  calibrations_allowed INT,
  calibrations_used INT,
  tokens_available INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as contract_id,
    c.contract_number,
    comp.name as company_name,
    cd.contract_price,
    cd.calibrations_allowed,
    cd.calibrations_used,
    (cd.calibrations_allowed - cd.calibrations_used) as tokens_available
  FROM contract_devices cd
  JOIN contracts c ON c.id = cd.contract_id
  JOIN companies comp ON comp.id = c.company_id
  WHERE cd.serial_number = p_serial_number
    AND c.year = p_year
    AND c.status = 'active'
    AND cd.calibrations_used < cd.calibrations_allowed;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORAGE BUCKET (run separately in Supabase dashboard)
-- =====================================================
-- Go to Storage in Supabase Dashboard and create bucket: 'rma-documents'
-- Set it to private (not public)

-- =====================================================
-- ROW LEVEL SECURITY (Optional - disable for simplicity)
-- =====================================================

ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_token_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- DONE!
-- =====================================================
