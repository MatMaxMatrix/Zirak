-- First, run the auth functions
CREATE SCHEMA IF NOT EXISTS auth;

-- Create the auth.user_id() function
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract the user ID from JWT claims
  -- Most common format from Auth0
  RETURN current_setting('request.jwt.claims', true)::json->>'userId';
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Next, run the profiles table creation
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

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT USING (id = auth.user_id());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT WITH CHECK (id = auth.user_id());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE USING (id = auth.user_id());

-- Finally, run the todos table creation
CREATE TABLE IF NOT EXISTS public.todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply trigger to todos table
CREATE TRIGGER todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Set up RLS policies
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Create policies for todos
CREATE POLICY "Users can view their own todos" 
ON public.todos
FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Users can create their own todos" 
ON public.todos
FOR INSERT WITH CHECK (user_id = auth.user_id());

CREATE POLICY "Users can update their own todos" 
ON public.todos
FOR UPDATE USING (user_id = auth.user_id());

CREATE POLICY "Users can delete their own todos" 
ON public.todos
FOR DELETE USING (user_id = auth.user_id());