-- ============================================================================
-- CORREÇÃO DE REGRAS ÚNICAS PARA MULTI-EMPRESAS (V2)
-- Remove as restrições globais e cria restrições por empresa (company_id)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove as restrições únicas globais antigas
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        WHERE tc.constraint_type = 'UNIQUE'
        AND (
            (tc.table_name = 'payment_methods' AND ccu.column_name = 'name') OR
            (tc.table_name = 'departamentos' AND ccu.column_name IN ('name', 'nome')) OR
            (tc.table_name = 'products' AND ccu.column_name = 'sku') OR
            (tc.table_name = 'customers' AND ccu.column_name = 'document') OR
            (tc.table_name = 'suppliers' AND ccu.column_name = 'document') OR
            (tc.table_name = 'employees' AND ccu.column_name = 'cpf')
        )
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Adiciona as novas restrições únicas por empresa
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_name_company_key') THEN
        ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_name_company_key UNIQUE (name, company_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departamentos_nome_company_key') THEN
        ALTER TABLE departamentos ADD CONSTRAINT departamentos_nome_company_key UNIQUE (nome, company_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_company_key') THEN
        ALTER TABLE products ADD CONSTRAINT products_sku_company_key UNIQUE (sku, company_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_document_company_key') THEN
        ALTER TABLE customers ADD CONSTRAINT customers_document_company_key UNIQUE (document, company_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_document_company_key') THEN
        ALTER TABLE suppliers ADD CONSTRAINT suppliers_document_company_key UNIQUE (document, company_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_cpf_company_key') THEN
        ALTER TABLE employees ADD CONSTRAINT employees_cpf_company_key UNIQUE (cpf, company_id);
    END IF;
END $$;
