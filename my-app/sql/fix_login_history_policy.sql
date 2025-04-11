-- First, check and drop any existing insert policies for login_history
DROP POLICY IF EXISTS "Allow inserting any login history" ON public.login_history;
DROP POLICY IF EXISTS "Service role can insert login history" ON public.login_history;

-- Create a policy that allows inserting login history from any authenticated user or service role
CREATE POLICY "Allow inserting login history" 
ON public.login_history 
FOR INSERT 
WITH CHECK (true);  -- This allows any insert regardless of user

-- Make sure RLS is enabled on the table
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Verify the policy was created
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
WHERE tablename = 'login_history'; 