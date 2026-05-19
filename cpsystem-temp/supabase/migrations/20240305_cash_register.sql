-- Migration: Cash Register System (Fechamento de Caixa Profissional)

-- 1. Cash Register Sessions (Abertura/Fechamento)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Operator ID (using TEXT to match potential auth.uid() or custom user string)
  opening_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closing_time TIMESTAMP WITH TIME ZONE,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(12,2),
  status TEXT NOT NULL DEFAULT 'Aberto', -- 'Aberto', 'Fechado'
  terminal_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cash Transactions (Sangria/Suprimento)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'Sangria', 'Suprimento'
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Cash Closing Logs (Conferência Detalhada)
CREATE TABLE IF NOT EXISTS cash_closing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  system_amount DECIMAL(12,2) NOT NULL,
  informed_amount DECIMAL(12,2) NOT NULL,
  difference DECIMAL(12,2) NOT NULL,
  justification TEXT,
  approved_by TEXT, -- Supervisor/Manager ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add session_id to sales to link them to a specific cash session
ALTER TABLE sales ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES cash_sessions(id);

-- 5. Enable RLS
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closing_logs ENABLE ROW LEVEL SECURITY;

-- 6. Policies (Public for dev, adjust for production)
DROP POLICY IF EXISTS "Allow all access to cash_sessions" ON cash_sessions;
CREATE POLICY "Allow all access to cash_sessions" ON cash_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to cash_transactions" ON cash_transactions;
CREATE POLICY "Allow all access to cash_transactions" ON cash_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to cash_closing_logs" ON cash_closing_logs;
CREATE POLICY "Allow all access to cash_closing_logs" ON cash_closing_logs FOR ALL USING (true);
