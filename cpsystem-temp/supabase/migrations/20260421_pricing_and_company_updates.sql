-- ============================================================================
-- PRICING MODES AND COMPANY DETAILS - 2024-04-21
-- Adds missing columns for wholesale, term and club prices, and company details
-- ============================================================================

-- 1. PRODUCTS TABLE UPDATES (Pricing Modes)
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'wholesale_price') THEN
        ALTER TABLE public.products ADD COLUMN wholesale_price DECIMAL(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'term_price') THEN
        ALTER TABLE public.products ADD COLUMN term_price DECIMAL(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'club_price') THEN
        ALTER TABLE public.products ADD COLUMN club_price DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- 2. COMPANIES TABLE UPDATES (Detailed Info)
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'trade_name') THEN
        ALTER TABLE public.companies ADD COLUMN trade_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'legal_name') THEN
        ALTER TABLE public.companies ADD COLUMN legal_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'state_registration') THEN
        ALTER TABLE public.companies ADD COLUMN state_registration TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'neighborhood') THEN
        ALTER TABLE public.companies ADD COLUMN neighborhood TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'city') THEN
        ALTER TABLE public.companies ADD COLUMN city TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'state') THEN
        ALTER TABLE public.companies ADD COLUMN state TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address_number') THEN
        ALTER TABLE public.companies ADD COLUMN address_number TEXT;
    END IF;
    
    -- Ensure phone column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 3. DATA MIGRATION
-- ----------------------------------------------------------------------------
-- Migrate existing data from 'name' to 'trade_name' and 'legal_name' if they are null
UPDATE public.companies 
SET trade_name = name, 
    legal_name = name 
WHERE trade_name IS NULL OR legal_name IS NULL;

-- 4. UPDATE AUDIT LOGS (If missing company_id)
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'company_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;
