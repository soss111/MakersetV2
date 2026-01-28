-- MakerSet Receipt Hub v2 - Seed Data
-- Initial admin user and default settings

-- Default admin user (password: Admin123!)
-- Password hash for 'Admin123!' using bcrypt with 10 rounds
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'admin@makerset.com',
    '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- This is a placeholder - will be replaced with actual hash
    'admin',
    'System',
    'Administrator',
    true
) ON CONFLICT (username) DO NOTHING;

-- Default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('site_name', 'MakerSet Receipt Hub', 'string', 'general', 'Site name'),
    ('site_description', 'Maker/STEM sets management and sales platform', 'string', 'general', 'Site description'),
    ('default_currency', 'USD', 'string', 'general', 'Default currency code'),
    ('order_prefix', 'MS', 'string', 'orders', 'Order number prefix'),
    ('min_order_amount', '0', 'number', 'orders', 'Minimum order amount'),
    ('shipping_enabled', 'true', 'boolean', 'orders', 'Enable shipping'),
    ('ratings_enabled', 'true', 'boolean', 'features', 'Enable product ratings'),
    ('invoice_email_enabled', 'true', 'boolean', 'features', 'Enable invoice email notifications'),
    ('provider_approval_required', 'true', 'boolean', 'providers', 'Require admin approval for provider sets')
ON CONFLICT (setting_key) DO NOTHING;

-- Note: The admin password hash above is a placeholder.
-- In production, generate it using: bcrypt.hash('Admin123!', 10)
-- For now, we'll generate it programmatically in the seed script
