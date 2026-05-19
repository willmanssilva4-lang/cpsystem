-- SCRIPT DE DADOS INICIAIS (SEED)
-- Execute este script APÓS o supabase_schema.sql

-- 1. Criar Perfil de Acesso Administrador
INSERT INTO access_profiles (id, name, description, permissions)
VALUES (
    'd290f1ee-6c54-4b01-90e6-d701748f0851', 
    'Administrador', 
    'Acesso total ao sistema', 
    '[
        {"module": "Produtos", "canView": true, "canCreate": true, "canEdit": true, "canDelete": true},
        {"module": "Vendas", "canView": true, "canCreate": true, "canEdit": true, "canDelete": true},
        {"module": "Financeiro", "canView": true, "canCreate": true, "canEdit": true, "canDelete": true},
        {"module": "Estoque", "canView": true, "canCreate": true, "canEdit": true, "canDelete": true},
        {"module": "Configurações", "canView": true, "canCreate": true, "canEdit": true, "canDelete": true}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. Inserir Produtos de Exemplo
INSERT INTO products (name, code, category, price, cost_price, stock, min_stock, unit)
VALUES 
('Coca-Cola 350ml', '789123456', 'Bebidas', 5.50, 2.80, 50, 10, 'un'),
('Hambúrguer Artesanal', '1001', 'Lanches', 28.90, 12.50, 0, 0, 'un'),
('Batata Frita M', '1002', 'Acompanhamentos', 12.00, 4.20, 100, 20, 'un'),
('Cerveja Heineken 600ml', '789654321', 'Bebidas', 14.00, 8.50, 24, 12, 'un'),
('Pizza Calabresa G', '2001', 'Pizzas', 45.00, 18.00, 0, 0, 'un')
ON CONFLICT (code) DO NOTHING;

-- 3. Inserir Clientes de Exemplo
INSERT INTO customers (name, email, phone, document, credit_limit)
VALUES 
('Consumidor Final', 'consumidor@exemplo.com', '00000000000', '000.000.000-00', 0),
('João Silva', 'joao@email.com', '11999999999', '123.456.789-00', 500.00),
('Maria Oliveira', 'maria@email.com', '11888888888', '987.654.321-11', 1000.00);

-- 4. Instrução para Usuário (IMPORTANTE)
-- Para criar o seu usuário de login, você deve:
-- 1. Ir na aba "Authentication" do Supabase.
-- 2. Criar um usuário com o email: suporte@cpsstem.com.br
-- 3. Copiar o ID (UUID) gerado para esse usuário.
-- 4. Executar o comando abaixo substituindo 'COLE_O_ID_AQUI' pelo ID copiado:

/*
INSERT INTO system_users (id, name, email, password, role, profile_id, active)
VALUES (
    'COLE_O_ID_AQUI', 
    'Administrador', 
    'suporte@cpsstem.com.br', 
    'SENHA_CRIPTOGRAFADA', -- O sistema gerencia isso no primeiro login
    'admin', 
    'd290f1ee-6c54-4b01-90e6-d701748f0851', 
    true
);
*/
