CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PRICE', 'PERCENTAGE', 'BUY_X_GET_Y', 'COMBO')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  target_type TEXT NOT NULL CHECK (target_type IN ('PRODUCT', 'CATEGORY', 'SUBCATEGORY', 'ALL')),
  target_id TEXT, -- Can be UUID of product/category or empty for ALL
  discount_value DECIMAL(12,2),
  buy_quantity INTEGER,
  pay_quantity INTEGER,
  combo_items JSONB, -- Array of product IDs
  combo_price DECIMAL(12,2),
  apply_automatically BOOLEAN DEFAULT true,
  limit_per_customer INTEGER,
  quantity_limit INTEGER,
  days_of_week JSONB, -- Array of integers 0-6 (Sunday-Saturday)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for all users on promotions" ON promotions FOR ALL USING (true) WITH CHECK (true);
