-- Migration: Add Supervisor Code to System Users
-- Description: Adds a numeric code for quick authorization in PDV

ALTER TABLE system_users ADD COLUMN IF NOT EXISTS supervisor_code TEXT;

-- Update existing admin user with a default code if needed
-- UPDATE system_users SET supervisor_code = '1234' WHERE username = 'admin';
