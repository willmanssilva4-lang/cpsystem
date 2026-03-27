-- 008_add_company_id_to_all_tables.sql
-- Adiciona a coluna company_id em todas as tabelas que ainda não a possuem.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id UUID', t);
        END IF;
    END LOOP;
END $$;

-- Garantir que cash_registers use UUID se possível, ou manter TEXT se já estiver populado.
-- No schema original estava como TEXT, mas o ERP usa UUIDs.
-- Se for necessário converter:
-- ALTER TABLE public.cash_registers ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
