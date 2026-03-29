-- Migration: Add missing columns to system_users
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS status TEXT;
-- supervisor_code was already added in 003_add_supervisor_code.sql
