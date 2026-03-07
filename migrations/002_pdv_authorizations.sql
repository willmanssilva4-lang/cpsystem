-- Migration: PDV Authorizations and Reversals
-- Description: Adds support for tracking authorized actions and sale reversals

-- 1. Update sales table to support reversals
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'reversed'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES system_users(id);

-- 2. Create authorization_logs table
-- Tracks every time a supervisor authorizes a sensitive action
CREATE TABLE IF NOT EXISTS authorization_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL, -- 'cancel_item', 'cancel_sale', 'reverse_sale', 'discount'
    authorized_by UUID REFERENCES system_users(id),
    operator_id UUID REFERENCES system_users(id),
    sale_id UUID REFERENCES sales(id),
    details JSONB, -- { item_id: '...', value: 10.50, reason: '...' }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update stock_movements to include reversal type
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists (names can vary)
    ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
    -- Re-add with the new 'reversal' type
    ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_type_check 
        CHECK (type IN ('in', 'out', 'adjustment', 'loss', 'reversal'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update stock_movements constraint. It might have a different name.';
END $$;

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_authorization_logs_sale_id ON authorization_logs(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- 5. Permissions (RLS)
ALTER TABLE authorization_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authorization_logs" ON authorization_logs;
CREATE POLICY "Allow all access to authorization_logs" ON authorization_logs FOR ALL USING (true);
