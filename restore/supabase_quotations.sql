-- SCRIPT PARA CRIAR AS TABELAS DO MÓDULO DE COTAÇÕES
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de Cotações
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Em Aberto',
  limit_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Itens da Cotação
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fornecedores da Cotação
CREATE TABLE IF NOT EXISTS quotation_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Respostas da Cotação (Preços informados)
CREATE TABLE IF NOT EXISTS quotation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  product_id UUID REFERENCES products(id),
  price DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_responses ENABLE ROW LEVEL SECURITY;

-- Criar Políticas de Acesso Público (Ajuste conforme necessário para produção)
DROP POLICY IF EXISTS "Public Access" ON quotations;
CREATE POLICY "Public Access" ON quotations FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON quotation_items;
CREATE POLICY "Public Access" ON quotation_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON quotation_suppliers;
CREATE POLICY "Public Access" ON quotation_suppliers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON quotation_responses;
CREATE POLICY "Public Access" ON quotation_responses FOR ALL USING (true);
