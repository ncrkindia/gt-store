-- Initialize additional databases or roles if necessary
-- The gtstore_db is already created by POSTGRES_DB environment variable.

CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS shipping;
