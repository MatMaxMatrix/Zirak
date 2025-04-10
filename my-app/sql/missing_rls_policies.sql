-- Enable RLS on tables that don't have it
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- API Keys table policies
CREATE POLICY "Users can view their own API keys" 
ON api_keys FOR SELECT 
USING (user_id = auth.user_id());

CREATE POLICY "Users can insert their own API keys" 
ON api_keys FOR INSERT 
WITH CHECK (user_id = auth.user_id());

CREATE POLICY "Users can update their own API keys" 
ON api_keys FOR UPDATE 
USING (user_id = auth.user_id());

CREATE POLICY "Users can delete their own API keys" 
ON api_keys FOR DELETE 
USING (user_id = auth.user_id());

-- Payment table policies
CREATE POLICY "Users can view their own payments" 
ON payments FOR SELECT 
USING (user_id = auth.user_id());

CREATE POLICY "Service role can insert payments" 
ON payments FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update payments" 
ON payments FOR UPDATE 
TO service_role
USING (true);

-- Subscription plans table policies
CREATE POLICY "Anyone can view subscription plans" 
ON subscription_plans FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage subscription plans" 
ON subscription_plans FOR ALL 
TO service_role
USING (true);

-- Subscriptions table policies
CREATE POLICY "Users can view their own subscriptions" 
ON subscriptions FOR SELECT 
USING (user_id = auth.user_id());

CREATE POLICY "Service role can manage subscriptions" 
ON subscriptions FOR ALL 
TO service_role
USING (true);

-- User settings table policies
CREATE POLICY "Users can view their own settings" 
ON user_settings FOR SELECT 
USING (user_id = auth.user_id());

CREATE POLICY "Users can insert their own settings" 
ON user_settings FOR INSERT 
WITH CHECK (user_id = auth.user_id());

CREATE POLICY "Users can update their own settings" 
ON user_settings FOR UPDATE 
USING (user_id = auth.user_id());

-- Add indexes for improved performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Standardize column names in profiles table
ALTER TABLE profiles RENAME COLUMN "Bio" TO bio;
ALTER TABLE profiles RENAME COLUMN "City" TO city;
ALTER TABLE profiles RENAME COLUMN "phone number" TO phone_number;

-- Add metadata JSONB column for profile extensibility
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Triggers for updating updated_at fields
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables that don't have it yet
CREATE TRIGGER api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at(); 