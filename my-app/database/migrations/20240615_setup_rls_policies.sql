-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
-- During signup/login we need to allow access without authentication
-- for creating and syncing profiles
CREATE POLICY "Anyone can view profiles" 
ON public.profiles FOR SELECT 
USING (true);

-- Allow profile updating through API routes without auth
CREATE POLICY "Allow profile updates" 
ON public.profiles FOR UPDATE 
USING (true);

-- Allow profile creation through API routes without auth
CREATE POLICY "Allow profile insertion for new users" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

-- Login history policies
-- Special policy allowing any insert for login history recording
CREATE POLICY "Allow inserting any login history" 
ON public.login_history FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own login history" 
ON public.login_history FOR SELECT 
USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Users can manage their own API keys" 
ON public.api_keys FOR ALL 
USING (auth.uid() = user_id);

-- Admin policies for all tables
-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
USING (is_admin());

-- Admin can manage all login history
CREATE POLICY "Admins can manage all login history" 
ON public.login_history FOR ALL 
USING (is_admin());

-- Admin can manage all user roles
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles FOR ALL 
USING (is_admin());

-- Admin can manage all API keys
CREATE POLICY "Admins can manage all API keys" 
ON public.api_keys FOR ALL 
USING (is_admin()); 