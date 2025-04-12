-- Create API Keys Table
-- This script creates or updates the api_keys table with the correct structure

-- First check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_keys') THEN
        -- Create the table
        CREATE TABLE public.api_keys (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            key_name TEXT NOT NULL,
            key_prefix TEXT NOT NULL,
            hashed_key TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}'::jsonb,
            UNIQUE (user_id, key_name)
        );
        
        -- Add indexes for better performance
        CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
        CREATE INDEX idx_api_keys_key_name ON public.api_keys(key_name);
        CREATE INDEX idx_api_keys_active ON public.api_keys(is_active);
        
        -- Add trigger for updated_at
        CREATE TRIGGER api_keys_updated_at
        BEFORE UPDATE ON public.api_keys
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
        
        RAISE NOTICE 'Created api_keys table with indexes and triggers';
    ELSE
        RAISE NOTICE 'api_keys table already exists';
        
        -- Check if user_id column is UUID type - if not, this would be handled in a migration
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'api_keys' 
            AND column_name = 'user_id' 
            AND data_type = 'uuid'
        ) THEN
            RAISE NOTICE 'user_id column is not UUID type - a migration script is needed';
        END IF;
    END IF;
END $$;

-- Ensure RLS is enabled on the table
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to ensure clean setup
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can manage all API keys" ON public.api_keys;

-- Create a unified policy for users to manage their own API keys
CREATE POLICY "Users can manage their own API keys" 
ON public.api_keys 
FOR ALL 
USING (auth.uid() = user_id);

-- Create a policy for admins to manage all API keys if is_admin() function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        EXECUTE 'CREATE POLICY "Admins can manage all API keys" ON public.api_keys FOR ALL USING (is_admin())';
        RAISE NOTICE 'Created admin policy for api_keys table';
    END IF;
END $$; 