-- Fix RLS Policies for login_history and profiles tables

-- 1. Create the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;

-- 2. Fix login_history table policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can delete all login_history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can manage all login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can update all login_history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
DROP POLICY IF EXISTS "Allow inserting login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;

-- Re-create policies with correct roles and conditions
-- Enable RLS on login_history table
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all login history (SELECT)
CREATE POLICY "Admins can view all login history" 
ON public.login_history 
FOR SELECT 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Users can view their own login history (SELECT)
CREATE POLICY "Users can view their own login history" 
ON public.login_history 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow inserting login history (INSERT)
CREATE POLICY "Allow inserting login history" 
ON public.login_history 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Admins can update all login history (UPDATE)
CREATE POLICY "Admins can update all login_history" 
ON public.login_history 
FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete all login history (DELETE)
CREATE POLICY "Admins can delete all login_history" 
ON public.login_history 
FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 3. Fix profiles table policies
-- First check if profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create policies for profiles table
-- Admins can view all profiles (SELECT)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Users can view their own profile (SELECT)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Users can update their own profile (UPDATE)
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- If needed, create INSERT policy for profiles
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid()); 