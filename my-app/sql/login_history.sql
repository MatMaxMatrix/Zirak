-- Create login_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.login_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    device TEXT,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS login_history_user_id_idx ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS login_history_login_at_idx ON public.login_history(login_at);

-- Enable Row Level Security
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own login history
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'login_history' 
        AND policyname = 'Users can view their own login history'
    ) THEN
        CREATE POLICY "Users can view their own login history"
        ON public.login_history
        FOR SELECT USING (
            user_id = auth.user_id()
        );
    END IF;
END $$;

-- Production function to record login history with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.record_user_login(
    p_user_id text,
    p_email text,
    p_name text,
    p_picture text DEFAULT NULL,
    p_device text DEFAULT 'Unknown',
    p_ip text DEFAULT '127.0.0.1'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists boolean;
BEGIN
    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_user_id
    ) INTO profile_exists;
    
    -- Create profile if it doesn't exist
    IF NOT profile_exists THEN
        INSERT INTO public.profiles (
            id,
            email,
            username,
            full_name,
            avatar_url,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_email,
            split_part(p_email, '@', 1),
            p_name,
            p_picture,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Insert login record
    INSERT INTO public.login_history (
        user_id,
        login_at,
        ip_address,
        device,
        location
    ) VALUES (
        p_user_id,
        NOW(),
        p_ip,
        p_device,
        'Unknown'
    );
    
    RETURN 'Login recorded successfully';
EXCEPTION
    WHEN others THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.record_user_login TO service_role;
GRANT ALL ON public.login_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE login_history_id_seq TO service_role; 