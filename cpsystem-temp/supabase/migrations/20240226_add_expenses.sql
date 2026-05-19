-- Create Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT DEFAULT 'Pago',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to expenses" ON expenses FOR ALL USING (true);

-- Insert some initial sample expenses
INSERT INTO expenses (description, category, amount, date, status)
VALUES 
('Aluguel Mensal', 'Infraestrutura', 2500.00, NOW() - INTERVAL '5 days', 'Pago'),
('Conta de Energia', 'Utilidades', 450.00, NOW() - INTERVAL '10 days', 'Pago'),
('Internet Fibra', 'Utilidades', 150.00, NOW() - INTERVAL '15 days', 'Pago'),
('Fornecedor de Bebidas', 'Fornecedores', 1200.00, NOW() - INTERVAL '2 days', 'Pendente');
