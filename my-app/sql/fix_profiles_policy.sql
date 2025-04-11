-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create a profile" ON public.profiles;

-- Create updated policies with proper UUID handling
-- Policy for viewing profiles (using UUID comparison)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid()::UUID = id);

-- Policy for updating profiles (using UUID comparison)
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid()::UUID = id);

-- IMPORTANT: Add a policy that allows inserting profiles with any ID
-- This is necessary because the profile might be created by the service role
CREATE POLICY "Anyone can create a profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);  -- Allow any insert operation

-- Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'profiles'; 