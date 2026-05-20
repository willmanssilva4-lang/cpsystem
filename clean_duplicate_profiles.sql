-- ==============================================================================
-- SCRIPT DE MIGRAÇÃO: DEDUPLICAÇÃO E CONSOLIDAÇÃO DE PERFIS DE ACESSO
-- Target: Supabase SQL Editor
-- 
-- Este script realiza uma limpeza no banco de dados para consolidar os perfis de acesso
-- duplicados ("Caixa", "Gerente", etc.). Ele atualiza todos os usuários associados a
-- perfis duplicados para o ID do perfil canônico (que possui as permissões corretas) e
-- remove perfis duplicados redundantes de forma segura e não destrutiva.
-- ==============================================================================

DO $$
DECLARE
    profile_record RECORD;
    canonical_id UUID;
    duplicate_record RECORD;
    migrated_users_count INT;
BEGIN
    RAISE NOTICE 'Iniciando migração de perfis de acesso...';

    -- Iterar sobre os nomes dos perfis de acesso padrões que podem estar duplicados
    FOR profile_record IN 
        SELECT DISTINCT LOWER(TRIM(name)) as clean_name, MAX(name) as original_name
        FROM public.access_profiles 
        WHERE TRIM(name) IN ('Caixa', 'Gerente', 'Financeiro', 'Comprador', 'Estoquista', 'Fiscal de Caixa', 'Administrador')
        GROUP BY LOWER(TRIM(name))
    LOOP
        -- 1. Identificar o perfil Canônico (aquele que possui permissões ou será o principal)
        -- Prioriza os perfis que possuem registros na tabela permissions.
        -- Se houver empate ou nenhum possuir permissões, ordena pelo ID canônico ou data de criação.
        SELECT ap.id INTO canonical_id
        FROM public.access_profiles ap
        LEFT JOIN (
            SELECT profile_id, COUNT(*) as perm_count 
            FROM public.permissions 
            GROUP BY profile_id
        ) p ON ap.id = p.profile_id
        WHERE LOWER(TRIM(ap.name)) = profile_record.clean_name
        ORDER BY COALESCE(p.perm_count, 0) DESC, ap.created_at ASC NULLS LAST, ap.id ASC
        LIMIT 1;

        IF canonical_id IS NOT NULL THEN
            RAISE NOTICE 'Perfil "%" - ID Canônico Mantido: %', profile_record.original_name, canonical_id;

            -- 2. Buscar todos os outros perfis de acesso que são duplicados desse mesmo nome
            FOR duplicate_record IN 
                SELECT id, name
                FROM public.access_profiles ap
                WHERE LOWER(TRIM(ap.name)) = profile_record.clean_name AND ap.id <> canonical_id
            LOOP
                -- 2a. Atualizar os usuários associados ao perfil duplicado para o perfil canônico
                UPDATE public.system_users 
                SET profile_id = canonical_id 
                WHERE profile_id = duplicate_record.id;
                
                GET DIAGNOSTICS migrated_users_count = ROW_COUNT;
                IF migrated_users_count > 0 THEN
                    RAISE NOTICE ' -> Migrados % usuários do perfil duplicado (%) para o canônico.', migrated_users_count, duplicate_record.id;
                END IF;

                -- 2b. Migrar permissões se o canônico ainda não possuir nenhuma, caso contrário apagar do duplicado
                IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE profile_id = canonical_id) THEN
                    UPDATE public.permissions 
                    SET profile_id = canonical_id 
                    WHERE profile_id = duplicate_record.id;
                    RAISE NOTICE ' -> Permissões do perfil duplicado (%) transferidas para o perfil canônico.', duplicate_record.id;
                ELSE
                    DELETE FROM public.permissions WHERE profile_id = duplicate_record.id;
                END IF;

                -- 2c. Remover o perfil duplicado obsoleto
                DELETE FROM public.access_profiles WHERE id = duplicate_record.id;
                RAISE NOTICE ' -> Perfil duplicado ID % excluído do banco de dados.', duplicate_record.id;
                
            END LOOP;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migração de perfis de acesso concluída com sucesso!';
END $$;
