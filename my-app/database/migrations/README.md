# Database Migrations

This folder contains SQL migrations for setting up and updating the database schema and security policies.

## Important Type Mismatch Fix

In this database, we have tables with different data types for related columns:
- The `users` table has `id` as UUID
- The `profiles` table has `id` as TEXT
- The `login_history` table has `user_id` as TEXT

This causes type mismatch errors (`operator does not exist: text = uuid`) when trying to query across these tables.

We've created stored procedures that handle the type casting properly.

## Running Migrations

### Option 1: Using the Supabase Dashboard (Recommended)

1. Go to the [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to the SQL Editor
4. Copy the contents of the migration files
5. Paste into the SQL Editor and run

### Option 2: Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run the migrations
supabase db push
```

## Migration Files

- `20240615_setup_rls_policies.sql`: Sets up Row Level Security policies for all tables
- `20240615_add_login_history_proc.sql`: Adds a stored procedure to handle login history with UUID conversion
- `20240615_add_profile_procs.sql`: Adds stored procedures for profile operations with UUID conversion

## Helper Functions Created

These functions properly handle the type conversion between UUID and TEXT:

- `record_login_history(p_user_id UUID, ...)`: Records login history with type conversion
- `check_profile_exists(p_user_id UUID)`: Checks if a profile exists
- `create_profile(p_user_id UUID, ...)`: Creates a profile with type conversion
- `get_profile_by_id(p_user_id UUID)`: Gets a profile with type conversion
- `update_profile(p_user_id UUID, ...)`: Updates a profile with type conversion

## Security Overview

These migrations implement a security model where:

1. Users can only access and modify their own data
2. Admin users (defined in the user_roles table) can access and modify all data
3. Row Level Security (RLS) is enforced for all tables

## Checking Policies

You can verify the policies are applied correctly using this SQL:

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
``` 