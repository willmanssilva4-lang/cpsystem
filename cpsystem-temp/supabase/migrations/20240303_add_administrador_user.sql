-- Insert default admin user (password: admin)
INSERT INTO system_users (username, password_hash, employee_id, profile_id, status)
VALUES ('administrador', '$2b$10$lq6n9.MvO6JZxkV/dV2UJeg/hG.bkf27lLMd1srvQTJjpbU1D.Pf2', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Ativo')
ON CONFLICT DO NOTHING;
