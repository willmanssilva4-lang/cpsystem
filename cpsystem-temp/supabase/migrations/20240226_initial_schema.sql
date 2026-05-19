-- Create Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  total_spent DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  total DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create Sale Items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies (Allowing all for now as it's a demo, but in production you'd restrict by user_id)
CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access to sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all access to sale_items" ON sale_items FOR ALL USING (true);

-- Insert initial data
INSERT INTO products (name, category, sku, cost_price, sale_price, stock, min_stock, image)
VALUES 
('Smartphone Pro Max', 'Eletrônicos', 'CEL-PRM-256', 4200, 5899, 42, 10, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop'),
('Fone Wireless Pro Audio', 'Eletrônicos', 'AUD-WRL-PRO', 150, 349, 8, 15, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'),
('Teclado Mecânico Office', 'Periféricos', 'TEC-MEC-OFF', 200, 450, 120, 20, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop'),
('Monitor UltraSharp 27"', 'Eletrônicos', 'MON-ULT-27', 1800, 2400, 5, 8, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop');

INSERT INTO customers (name, document, phone, email, total_spent, status, image)
VALUES 
('João Silva', '123.456.789-00', '(11) 98765-4321', 'joao@email.com', 12500, 'Ativo', 'https://i.pravatar.cc/150?u=joao'),
('Maria Oliveira', '98.765.432/0001-99', '(21) 99887-7665', 'maria@empresa.com', 8200.50, 'VIP', 'https://i.pravatar.cc/150?u=maria');
