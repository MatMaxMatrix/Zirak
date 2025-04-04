-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- This matches Auth0 user.sub
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT USING (
    id = auth.user_id()
);

-- Create policy for inserting own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT WITH CHECK (
    id = auth.user_id()
);

-- Create policy for updating own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE USING (
    id = auth.user_id()
);