-- Script de Migração: Árvore Mercadológica Profissional para Supermercados
-- Este script insere Departamentos, Categorias e Subcategorias seguindo o padrão 01.01.01

DO $$
DECLARE
    dept_id UUID;
    cat_id UUID;
BEGIN
    -- ==========================================
    -- 01 MERCEARIA SECA
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('MERCEARIA SECA', '01', true) RETURNING id INTO dept_id;
    
    -- 01.01 Cereais
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Cereais', '01.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Arroz', '01.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Feijão', '01.01.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Lentilha', '01.01.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Grão de Bico', '01.01.04', cat_id);

    -- 01.02 Massas
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Massas', '01.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Macarrão Espaguete', '01.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Macarrão Parafuso', '01.02.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Macarrão Instantâneo', '01.02.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Lasanha', '01.02.04', cat_id);

    -- 01.03 Farinhas
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Farinhas', '01.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Farinha de Trigo', '01.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Farinha de Mandioca', '01.03.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Fubá', '01.03.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Farinha de Milho', '01.03.04', cat_id);

    -- 01.04 Enlatados
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Enlatados', '01.04', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Milho', '01.04.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Ervilha', '01.04.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sardinha', '01.04.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Atum', '01.04.04', cat_id);

    -- ==========================================
    -- 02 BEBIDAS
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('BEBIDAS', '02', true) RETURNING id INTO dept_id;
    
    -- 02.01 Refrigerantes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Refrigerantes', '02.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Coca-Cola', '02.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Guaraná', '02.01.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Pepsi', '02.01.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Soda', '02.01.04', cat_id);

    -- 02.02 Cervejas
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Cervejas', '02.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Skol', '02.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Brahma', '02.02.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Antarctica', '02.02.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Heineken', '02.02.04', cat_id);

    -- 02.03 Energéticos
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Energéticos', '02.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Red Bull', '02.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Monster', '02.03.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('TNT', '02.03.03', cat_id);

    -- 02.04 Sucos
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Sucos', '02.04', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Suco Natural', '02.04.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Suco de Caixa', '02.04.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Suco em Pó', '02.04.03', cat_id);

    -- ==========================================
    -- 03 FRIOS E LATICÍNIOS
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('FRIOS E LATICÍNIOS', '03', true) RETURNING id INTO dept_id;
    
    -- 03.01 Queijos
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Queijos', '03.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Mussarela', '03.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Prato', '03.01.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Parmesão', '03.01.03', cat_id);

    -- 03.02 Presuntos
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Presuntos', '03.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Presunto Cozido', '03.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Presunto Defumado', '03.02.02', cat_id);

    -- 03.03 Iogurtes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Iogurtes', '03.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Iogurte Natural', '03.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Iogurte Grego', '03.03.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Iogurte de Morango', '03.03.03', cat_id);

    -- 03.04 Leites
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Leites', '03.04', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Leite Integral', '03.04.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Leite Desnatado', '03.04.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Leite em Pó', '03.04.03', cat_id);

    -- ==========================================
    -- 04 HORTIFRUTI
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('HORTIFRUTI', '04', true) RETURNING id INTO dept_id;
    
    -- 04.01 Frutas
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Frutas', '04.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Banana', '04.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Maçã', '04.01.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Laranja', '04.01.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Mamão', '04.01.04', cat_id);

    -- 04.02 Verduras
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Verduras', '04.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Alface', '04.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Couve', '04.02.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Espinafre', '04.02.03', cat_id);

    -- 04.03 Legumes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Legumes', '04.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Tomate', '04.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Cenoura', '04.03.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Batata', '04.03.03', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Cebola', '04.03.04', cat_id);

    -- ==========================================
    -- 05 AÇOUGUE
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('AÇOUGUE', '05', true) RETURNING id INTO dept_id;
    
    -- 05.01 Carne Bovina
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Carne Bovina', '05.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Alcatra', '05.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Picanha', '05.01.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Acém', '05.01.03', cat_id);

    -- 05.02 Carne Suína
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Carne Suína', '05.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Lombo', '05.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Costela', '05.02.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Pernil', '05.02.03', cat_id);

    -- 05.03 Frango
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Frango', '05.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Frango Inteiro', '05.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Peito de Frango', '05.03.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Coxa e Sobrecoxa', '05.03.03', cat_id);

    -- ==========================================
    -- 06 CONGELADOS
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('CONGELADOS', '06', true) RETURNING id INTO dept_id;
    
    -- 06.01 Pratos Prontos
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Pratos Prontos', '06.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Lasanha', '06.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Pizza', '06.01.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Nuggets', '06.01.03', cat_id);

    -- 06.02 Sorvetes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Sorvetes', '06.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sorvete Pote', '06.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Picolé', '06.02.02', cat_id);

    -- 06.03 Vegetais Congelados
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Vegetais Congelados', '06.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Brócolis', '06.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Ervilha', '06.03.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Milho', '06.03.03', cat_id);

    -- ==========================================
    -- 07 LIMPEZA
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('LIMPEZA', '07', true) RETURNING id INTO dept_id;
    
    -- 07.01 Detergentes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Detergentes', '07.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Detergente Líquido', '07.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Lava Louças', '07.01.02', cat_id);

    -- 07.02 Sabão
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Sabão', '07.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sabão em Pó', '07.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sabão Líquido', '07.02.02', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sabão em Barra', '07.02.03', cat_id);

    -- 07.03 Desinfetantes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Desinfetantes', '07.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Desinfetante Floral', '07.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Desinfetante Lavanda', '07.03.02', cat_id);

    -- ==========================================
    -- 08 PERFUMARIA
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('PERFUMARIA', '08', true) RETURNING id INTO dept_id;
    
    -- 08.01 Shampoo
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Shampoo', '08.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Shampoo Anticaspa', '08.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Shampoo Hidratante', '08.01.02', cat_id);

    -- 08.02 Sabonetes
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Sabonetes', '08.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sabonete Barra', '08.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sabonete Líquido', '08.02.02', cat_id);

    -- 08.03 Higiene Bucal
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Higiene Bucal', '08.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Creme Dental', '08.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Escova de Dente', '08.03.02', cat_id);

    -- ==========================================
    -- 09 UTILIDADES DOMÉSTICAS
    -- ==========================================
    INSERT INTO departamentos (nome, codigo, ativo) VALUES ('UTILIDADES DOMÉSTICAS', '09', true) RETURNING id INTO dept_id;
    
    -- 09.01 Descartáveis
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Descartáveis', '09.01', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Copos Descartáveis', '09.01.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Pratos Descartáveis', '09.01.02', cat_id);

    -- 09.02 Alumínio
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Alumínio', '09.02', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Papel Alumínio', '09.02.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Assadeiras', '09.02.02', cat_id);

    -- 09.03 Plásticos
    INSERT INTO categorias (nome, codigo, departamento_id) VALUES ('Plásticos', '09.03', dept_id) RETURNING id INTO cat_id;
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Potes', '09.03.01', cat_id);
    INSERT INTO subcategorias (nome, codigo, categoria_id) VALUES ('Sacos para Lixo', '09.03.02', cat_id);

END $$;
