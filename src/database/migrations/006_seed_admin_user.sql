-- Development administrator account. This migration is idempotent so it also
-- promotes an existing account with the same email to the admin role.
INSERT INTO users (email, password_hash, first_name, last_name, role, status)
VALUES (
  'admin@zeescents.test',
  '$2a$10$KZNWznalW7nIshI8/2oRoeBExkprW4HAFqG0rLcesCr/cwH3QqbH.',
  'ZeeScents',
  'Admin',
  'admin',
  'active'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  role = 'admin',
  status = 'active';
