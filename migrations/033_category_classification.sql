INSERT INTO categories (id, account_id, name, icon, color)
SELECT gen_random_uuid()::text, a.id, 'Sex shop', '💜', '#8b5cf6'
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.account_id = a.id AND lower(c.name) = lower('Sex shop'));

INSERT INTO categories (id, account_id, name, icon, color)
SELECT gen_random_uuid()::text, a.id, 'Esporte e lazer', '⚽', '#0d9488'
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.account_id = a.id AND lower(c.name) = lower('Esporte e lazer'));

INSERT INTO categories (id, account_id, name, icon, color)
SELECT gen_random_uuid()::text, a.id, 'Alimentos e bebidas', '🥫', '#ea580c'
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.account_id = a.id AND lower(c.name) = lower('Alimentos e bebidas'));

INSERT INTO promo_groups (id, account_id, name, category_id, status)
SELECT gen_random_uuid()::text, c.account_id, 'Ofertas íntimas', c.id, 'PAUSED'
FROM categories c
WHERE lower(c.name) = lower('Sex shop')
AND NOT EXISTS (SELECT 1 FROM promo_groups g WHERE g.account_id = c.account_id AND lower(g.name) = lower('Ofertas íntimas'));