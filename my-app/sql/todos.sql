-- Create todos table
CREATE TABLE IF NOT EXISTS public.todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE TRIGGER todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Set up RLS policies
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own todos" 
ON public.todos
FOR SELECT USING (
    user_id = auth.user_id()
);

CREATE POLICY "Users can create their own todos" 
ON public.todos
FOR INSERT WITH CHECK (
    user_id = auth.user_id()
);

CREATE POLICY "Users can update their own todos" 
ON public.todos
FOR UPDATE USING (
    user_id = auth.user_id()
);

CREATE POLICY "Users can delete their own todos" 
ON public.todos
FOR DELETE USING (
    user_id = auth.user_id()
); 