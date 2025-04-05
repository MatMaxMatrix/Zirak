-- Update the auth.user_id() function to properly parse our token
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract the user ID from JWT claims
  -- First check for 'userId' which is what we set in our token
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'userId',
    current_setting('request.jwt.claims', true)::json->>'sub',
    NULL
  );
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for service_role in the JWT
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  -- Check for admin in x-hasura-default-role
  IF current_setting('request.jwt.claims', true)::json->>'x-hasura-default-role' = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check roles array for admin role
  DECLARE 
    roles_json json;
  BEGIN
    roles_json := current_setting('request.jwt.claims', true)::json->'roles';
    IF roles_json IS NOT NULL AND roles_json @> '"admin"'::jsonb THEN
      RETURN TRUE;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  
  RETURN FALSE;
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Add admin policy to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT 
USING (auth.is_admin());

-- Add admin policy to update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (auth.is_admin());

-- Add policies for other tables too

-- Add admin policy for all todos
CREATE POLICY "Admins can view all todos"
ON public.todos
FOR SELECT 
USING (auth.is_admin());

-- Add admin policy to manage all todos
CREATE POLICY "Admins can manage all todos"
ON public.todos
FOR ALL
USING (auth.is_admin());

-- Admin policy to allow admins to view all profiles
-- This resolves the issue where admin dashboard only shows admin user

-- Check if the policy already exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles"
        ON public.profiles
        FOR SELECT
        USING (
            auth.jwt() ->> 'email' = 'admin@example.com' OR 
            EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(auth.jwt() -> 'roles') AS role
                WHERE role = 'admin'
            )
        );
        
        RAISE NOTICE 'Created admin policy for profiles table';
    ELSE
        RAISE NOTICE 'Admin policy for profiles table already exists';
    END IF;
END $$;

-- Similar policy for login_history table to allow admins to view all login history
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'login_history' 
        AND policyname = 'Admins can view all login history'
    ) THEN
        CREATE POLICY "Admins can view all login history"
        ON public.login_history
        FOR SELECT
        USING (
            auth.jwt() ->> 'email' = 'admin@example.com' OR 
            EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(auth.jwt() -> 'roles') AS role
                WHERE role = 'admin'
            )
        );
        
        RAISE NOTICE 'Created admin policy for login_history table';
    ELSE
        RAISE NOTICE 'Admin policy for login_history table already exists';
    END IF;
END $$;

-- Create a function to check admin status from JWT
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'email' = 'admin@example.com' OR 
        EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(auth.jwt() -> 'roles') AS role
            WHERE role = 'admin'
        )
    );
EXCEPTION
    WHEN OTHERS THEN RETURN FALSE;
END;
$$; 