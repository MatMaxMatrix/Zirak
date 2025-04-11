-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;

-- Create a new policy with proper UUID casting
CREATE POLICY "Users can view their own login history" 
ON public.login_history
FOR SELECT 
USING (auth.uid()::UUID = user_id);

-- Make sure RLS is enabled
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Verify updated policies
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

-- Update our auth.user_id() function if needed
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID AS $$
BEGIN
  RETURN coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid,
    nullif(current_setting('request.jwt.claims', true)::json->>'userId', '')::uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE; 