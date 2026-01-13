-- Migration: Add company_name and attention fields to shipping_addresses
-- Run this in Supabase SQL Editor

-- Add company_name column
ALTER TABLE shipping_addresses 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add attention column  
ALTER TABLE shipping_addresses
ADD COLUMN IF NOT EXISTS attention TEXT;

-- Update existing addresses to have company_name from label if empty
UPDATE shipping_addresses 
SET company_name = label 
WHERE company_name IS NULL;

-- Also make serial_number nullable on service_requests if it's causing issues
-- (since devices are now stored in request_devices table)
ALTER TABLE service_requests 
ALTER COLUMN serial_number DROP NOT NULL;

ALTER TABLE service_requests 
ALTER COLUMN equipment_type DROP NOT NULL;
