-- Comprehensive RLS Policy Fix Script

BEGIN;

-- Ensure is_admin function exists and is correct (already done, but included for completeness)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

-- Drop existing incorrect/conflicting policies for relevant tables
-- Note: Add other tables here if they have similar incorrect policies
DROP POLICY IF EXISTS "Admins can delete all api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can manage all API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can update all api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can view all api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;

DROP POLICY IF EXISTS "Admins can delete all contact_queries" ON public.contact_queries;
DROP POLICY IF EXISTS "Admins can update all queries" ON public.contact_queries;
DROP POLICY IF EXISTS "Admins can view all queries" ON public.contact_queries;
DROP POLICY IF EXISTS "Users can insert their own queries" ON public.contact_queries;
DROP POLICY IF EXISTS "Users can view their own queries" ON public.contact_queries;

DROP POLICY IF EXISTS "Admins can delete all login_history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can update all login_history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
DROP POLICY IF EXISTS "Allow inserting login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;

DROP POLICY IF EXISTS "Admins can delete all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create a profile" ON public.profiles; -- Review if public insert needed
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Admins can delete all subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can update all subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can view all subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
-- Keep service_role policy if needed

DROP POLICY IF EXISTS "Admins can delete all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

DROP POLICY IF EXISTS "Admins can delete all todos" ON public.todos;
DROP POLICY IF EXISTS "Admins can update all todos" ON public.todos;
DROP POLICY IF EXISTS "Users can create their own todos" ON public.todos; -- Check this policy logic/role
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos; -- Duplicate insert?
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
-- Keep service_role policy if needed

DROP POLICY IF EXISTS "Admins can delete all user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Admins can update all user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Admins can view all user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;

-- Assuming a table named 'users' exists and needs fixing (based on policy dump)
DROP POLICY IF EXISTS "Admins can delete all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Re-create policies with correct roles and conditions

-- api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on api_keys" ON public.api_keys FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User access own api_keys" ON public.api_keys FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- contact_queries
ALTER TABLE public.contact_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access contact_queries" ON public.contact_queries FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User select own contact_queries" ON public.contact_queries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User insert contact_queries" ON public.contact_queries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- login_history
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all login history" ON public.login_history FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update all login_history" ON public.login_history FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete all login_history" ON public.login_history FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their own login history" ON public.login_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow inserting own login history" ON public.login_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User select own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin can delete any profile" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
-- Note: Removed "Anyone can create a profile". Re-add with specific conditions if needed for signup.

-- subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access subscription_plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans FOR SELECT TO public USING (true);
-- Keep service_role policy if it exists and is needed: GRANT ALL ON subscription_plans TO service_role;

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User select own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access todos" ON public.todos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User access own todos" ON public.todos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Keep service_role policy if it exists and is needed: GRANT ALL ON user_roles TO service_role;

-- user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access user_settings" ON public.user_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User access own user_settings" ON public.user_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- users table (assuming 'id' is the user UUID column)
-- Check table/column names if different
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access users table" ON public.users FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User select own users table data" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "User update own users table data" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

COMMIT; 