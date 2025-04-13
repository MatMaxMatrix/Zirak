-- Migration to convert profile IDs from TEXT to UUID
-- Be very careful when running this as it changes column types on existing data

-- Create backups of all tables before making changes
CREATE TABLE IF NOT EXISTS profiles_backup AS SELECT * FROM profiles;
CREATE TABLE IF NOT EXISTS login_history_backup AS SELECT * FROM login_history;
CREATE TABLE IF NOT EXISTS api_keys_backup AS SELECT * FROM api_keys;
CREATE TABLE IF NOT EXISTS user_roles_backup AS SELECT * FROM user_roles;
CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM subscriptions;
CREATE TABLE IF NOT EXISTS payments_backup AS SELECT * FROM payments;
CREATE TABLE IF NOT EXISTS todos_backup AS SELECT * FROM todos;
CREATE TABLE IF NOT EXISTS user_settings_backup AS SELECT * FROM user_settings;

-- STEP 1: Drop all RLS policies first for ALL tables
-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile insertion for new users" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Login history policies
DROP POLICY IF EXISTS "Users can view their own login history" ON login_history;
DROP POLICY IF EXISTS "Allow inserting any login history" ON login_history;
DROP POLICY IF EXISTS "Service role can insert login history" ON login_history;
DROP POLICY IF EXISTS "Admins can manage all login history" ON login_history;

-- API keys policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can manage all API keys" ON api_keys;

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update any role" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete any role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Service role can insert payments" ON payments;
DROP POLICY IF EXISTS "Service role can update payments" ON payments;

-- Todos policies
DROP POLICY IF EXISTS "Users can view their own todos" ON todos;
DROP POLICY IF EXISTS "Users can create their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;

-- User settings policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;

-- STEP 2: Drop all foreign key constraints
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_user_id_fkey;
ALTER TABLE login_history DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

-- STEP 3: Now we can alter the profiles table
-- Drop the primary key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;

-- Add a new UUID column to profiles
ALTER TABLE profiles ADD COLUMN temp_id UUID;

-- Update the temp_id column with the UUID conversion of the id
UPDATE profiles SET temp_id = id::UUID WHERE id IS NOT NULL;

-- Drop the old id column
ALTER TABLE profiles DROP COLUMN id;

-- Rename the temp_id column to id
ALTER TABLE profiles RENAME COLUMN temp_id TO id;

-- Add back the primary key constraint
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- STEP 4: Now modify all the dependent tables

-- Fix login_history table
ALTER TABLE login_history ADD COLUMN temp_user_id UUID;
UPDATE login_history SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE login_history DROP COLUMN user_id;
ALTER TABLE login_history RENAME COLUMN temp_user_id TO user_id;

-- Fix api_keys table
ALTER TABLE api_keys ADD COLUMN temp_user_id UUID;
UPDATE api_keys SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE api_keys DROP COLUMN user_id;
ALTER TABLE api_keys RENAME COLUMN temp_user_id TO user_id;

-- Fix user_roles table
ALTER TABLE user_roles ADD COLUMN temp_user_id UUID;
UPDATE user_roles SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE user_roles DROP COLUMN user_id;
ALTER TABLE user_roles RENAME COLUMN temp_user_id TO user_id;

-- Fix subscriptions table
ALTER TABLE subscriptions ADD COLUMN temp_user_id UUID;
UPDATE subscriptions SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE subscriptions DROP COLUMN user_id;
ALTER TABLE subscriptions RENAME COLUMN temp_user_id TO user_id;

-- Fix payments table
ALTER TABLE payments ADD COLUMN temp_user_id UUID;
UPDATE payments SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE payments DROP COLUMN user_id;
ALTER TABLE payments RENAME COLUMN temp_user_id TO user_id;

-- Fix todos table
ALTER TABLE todos ADD COLUMN temp_user_id UUID;
UPDATE todos SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE todos DROP COLUMN user_id;
ALTER TABLE todos RENAME COLUMN temp_user_id TO user_id;

-- Fix user_settings table
ALTER TABLE user_settings ADD COLUMN temp_user_id UUID;
UPDATE user_settings SET temp_user_id = user_id::UUID WHERE user_id IS NOT NULL;
ALTER TABLE user_settings DROP COLUMN user_id;
ALTER TABLE user_settings RENAME COLUMN temp_user_id TO user_id;

-- STEP 5: Re-add all foreign key constraints
ALTER TABLE login_history ADD CONSTRAINT login_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
  
ALTER TABLE api_keys ADD CONSTRAINT api_keys_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
  
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
  
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
  
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
  
ALTER TABLE todos ADD CONSTRAINT todos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
  
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

-- STEP 6: Re-create RLS policies with UUID comparisons
-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid()::UUID = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid()::UUID = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid()::UUID = id);

-- Login history policies
CREATE POLICY "Users can view their own login history" 
ON public.login_history FOR SELECT 
USING (auth.uid()::UUID = user_id);

CREATE POLICY "Allow inserting any login history" 
ON public.login_history FOR INSERT 
WITH CHECK (true);

-- API keys policies
CREATE POLICY "Users can manage their own API keys" 
ON public.api_keys FOR ALL 
USING (auth.uid()::UUID = user_id);

-- User roles policies
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid()::UUID = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (auth.uid()::UUID = user_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
USING (auth.uid()::UUID = user_id);

-- Todos policies
CREATE POLICY "Users can view their own todos" 
ON public.todos FOR SELECT 
USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users can create their own todos" 
ON public.todos FOR INSERT 
WITH CHECK (auth.uid()::UUID = user_id);

CREATE POLICY "Users can update their own todos" 
ON public.todos FOR UPDATE 
USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users can delete their own todos" 
ON public.todos FOR DELETE 
USING (auth.uid()::UUID = user_id);

-- User settings policies
CREATE POLICY "Users can view their own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid()::UUID = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid()::UUID = user_id);

-- We can now drop the stored procedures that were handling type conversion
-- These procedures are no longer needed but we'll keep them for backward compatibility
-- with any code that might still be using them
-- If you want to drop them, uncomment these lines:
-- DROP FUNCTION IF EXISTS check_profile_exists;
-- DROP FUNCTION IF EXISTS create_profile;
-- DROP FUNCTION IF EXISTS get_profile_by_id;
-- DROP FUNCTION IF EXISTS update_profile;
-- DROP FUNCTION IF EXISTS record_login_history; 