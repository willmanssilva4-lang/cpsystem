-- Quotations Module Tables

-- 1. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Em Aberto', -- 'Em Aberto', 'Finalizada', 'Cancelada'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quotation Suppliers (Fornecedores convidados para a cotação)
CREATE TABLE IF NOT EXISTS quotation_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quotation Responses (Preços informados pelos fornecedores)
CREATE TABLE IF NOT EXISTS quotation_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_responses ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow all access to quotations" ON quotations;
CREATE POLICY "Allow all access to quotations" ON quotations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to quotation_items" ON quotation_items;
CREATE POLICY "Allow all access to quotation_items" ON quotation_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to quotation_suppliers" ON quotation_suppliers;
CREATE POLICY "Allow all access to quotation_suppliers" ON quotation_suppliers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to quotation_responses" ON quotation_responses;
CREATE POLICY "Allow all access to quotation_responses" ON quotation_responses FOR ALL USING (true);
