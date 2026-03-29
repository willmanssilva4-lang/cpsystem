CREATE TABLE IF NOT EXISTS public.produto_lotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    produto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    numero_lote VARCHAR(255) NOT NULL,
    data_entrada DATE NOT NULL,
    validade DATE NOT NULL,
    custo_unit DECIMAL(10, 2) NOT NULL,
    quantidade_inicial DECIMAL(10, 3) NOT NULL,
    saldo_atual DECIMAL(10, 3) NOT NULL,
    fornecedor_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add lote_id and cost to stock_movements if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'lote_id') THEN
        ALTER TABLE public.stock_movements ADD COLUMN lote_id UUID REFERENCES public.produto_lotes(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'cost') THEN
        ALTER TABLE public.stock_movements ADD COLUMN cost DECIMAL(10, 2);
    END IF;
END $$;
