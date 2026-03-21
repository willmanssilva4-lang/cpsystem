-- 007_returns_and_mercadological.sql
-- Migration for Returns, Reversals, Promotions and Mercadological Tree

-- 1. Mercadological Tree (Departamentos, Categorias, Subcategorias)
CREATE TABLE IF NOT EXISTS public.departamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subcategorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Promotions (Promoções)
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PRICE', 'PERCENTAGE', 'BUY_X_GET_Y', 'COMBO')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    target_type TEXT NOT NULL CHECK (target_type IN ('PRODUCT', 'CATEGORY', 'SUBCATEGORY', 'ALL')),
    target_id UUID,
    discount_value DECIMAL(12,2),
    buy_quantity INTEGER,
    pay_quantity INTEGER,
    combo_items UUID[], -- Array of product IDs
    combo_price DECIMAL(12,2),
    apply_automatically BOOLEAN DEFAULT TRUE,
    limit_per_customer INTEGER,
    quantity_limit INTEGER,
    days_of_week INTEGER[], -- 0-6 (Sunday-Saturday)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Returns and Reversals (Devoluções e Estornos)
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    date TIMESTAMPTZ DEFAULT NOW(),
    total DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PARCIAL', 'TOTAL')),
    refund_method TEXT NOT NULL,
    user_id UUID REFERENCES public.system_users(id),
    status TEXT NOT NULL DEFAULT 'CONCLUÍDO' CHECK (status IN ('CONCLUÍDO', 'CANCELADO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity DECIMAL(12,3) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS for new tables
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Public access for simplicity, adjust as needed)
DROP POLICY IF EXISTS "Enable all access for all users" ON public.departamentos;
CREATE POLICY "Enable all access for all users" ON public.departamentos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.categorias;
CREATE POLICY "Enable all access for all users" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.subcategorias;
CREATE POLICY "Enable all access for all users" ON public.subcategorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.promotions;
CREATE POLICY "Enable all access for all users" ON public.promotions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.returns;
CREATE POLICY "Enable all access for all users" ON public.returns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.return_items;
CREATE POLICY "Enable all access for all users" ON public.return_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Update products table to include mercadological references
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcategoria_id') THEN
        ALTER TABLE public.products ADD COLUMN subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'codigo_mercadologico') THEN
        ALTER TABLE public.products ADD COLUMN codigo_mercadologico TEXT;
    END IF;
END $$;
