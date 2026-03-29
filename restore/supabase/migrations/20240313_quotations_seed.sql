-- Seed data for Quotations
-- 1. Insert Suppliers
INSERT INTO suppliers (name, document, phone, email)
VALUES 
('Ambev S.A.', '02.261.666/0001-bc', '(11) 2122-1200', 'contato@ambev.com.br'),
('Coca-Cola FEMSA', '45.997.418/0001-53', '(11) 2141-3700', 'vendas@coca-cola.com.br'),
('Heineken Brasil', '03.353.358/0001-96', '(11) 4358-8800', 'atendimento@heineken.com.br')
ON CONFLICT DO NOTHING;

-- 2. Insert a Sample Quotation
DO $$
DECLARE
    q_id UUID;
    p_coca UUID;
    p_heineken UUID;
    s_ambev UUID;
    s_coca UUID;
    s_heineken UUID;
BEGIN
    -- Get product IDs
    SELECT id INTO p_coca FROM products WHERE name = 'Coca-Cola 350ml' LIMIT 1;
    SELECT id INTO p_heineken FROM products WHERE name = 'Cerveja Heineken 600ml' LIMIT 1;
    
    -- Get supplier IDs
    SELECT id INTO s_ambev FROM suppliers WHERE name = 'Ambev S.A.' LIMIT 1;
    SELECT id INTO s_coca FROM suppliers WHERE name = 'Coca-Cola FEMSA' LIMIT 1;
    SELECT id INTO s_heineken FROM suppliers WHERE name = 'Heineken Brasil' LIMIT 1;

    -- Insert Quotation
    INSERT INTO quotations (title, status)
    VALUES ('Cotação de Bebidas - Março 2024', 'Em Aberto')
    RETURNING id INTO q_id;

    -- Insert Items
    IF p_coca IS NOT NULL THEN
        INSERT INTO quotation_items (quotation_id, product_id, quantity)
        VALUES (q_id, p_coca, 100);
    END IF;
    
    IF p_heineken IS NOT NULL THEN
        INSERT INTO quotation_items (quotation_id, product_id, quantity)
        VALUES (q_id, p_heineken, 50);
    END IF;

    -- Insert Suppliers
    IF s_ambev IS NOT NULL THEN
        INSERT INTO quotation_suppliers (quotation_id, supplier_id) VALUES (q_id, s_ambev);
    END IF;
    IF s_coca IS NOT NULL THEN
        INSERT INTO quotation_suppliers (quotation_id, supplier_id) VALUES (q_id, s_coca);
    END IF;
    IF s_heineken IS NOT NULL THEN
        INSERT INTO quotation_suppliers (quotation_id, supplier_id) VALUES (q_id, s_heineken);
    END IF;

    -- Insert some responses (mocking supplier responses)
    IF s_ambev IS NOT NULL AND p_heineken IS NOT NULL THEN
        INSERT INTO quotation_responses (quotation_id, supplier_id, product_id, price)
        VALUES (q_id, s_ambev, p_heineken, 7.50);
    END IF;
    
    IF s_coca IS NOT NULL AND p_coca IS NOT NULL THEN
        INSERT INTO quotation_responses (quotation_id, supplier_id, product_id, price)
        VALUES (q_id, s_coca, p_coca, 2.45);
    END IF;
END $$;
