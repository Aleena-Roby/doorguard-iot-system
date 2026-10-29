-- Create test database if it doesn't already exist
SELECT 'CREATE DATABASE doorguard_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'doorguard_test')\gexec

