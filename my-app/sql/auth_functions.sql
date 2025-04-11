-- Create a function to extract userId from JWT claims
-- First drop the existing function since we're changing the return type
DROP FUNCTION IF EXISTS auth.user_id();

create or replace function auth.user_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'userId', '')::uuid;
$$ language sql stable;

-- Create policy for todos table with checks for existence
-- You need to run this on the Supabase SQL editor

-- Check for view policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'todos' 
        AND policyname = 'Users can view their own todos'
    ) THEN
        create policy "Users can view their own todos"
          on todos for select
          using (auth.user_id() = user_id);
        
        RAISE NOTICE 'Created view policy for todos table';
    END IF;
END $$;

-- Check for insert policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'todos' 
        AND policyname = 'Users can insert their own todos'
    ) THEN
        create policy "Users can insert their own todos"
          on todos for insert
          with check (auth.user_id() = user_id);
        
        RAISE NOTICE 'Created insert policy for todos table';
    END IF;
END $$;

-- Check for update policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'todos' 
        AND policyname = 'Users can update their own todos'
    ) THEN
        create policy "Users can update their own todos"
          on todos for update
          using (auth.user_id() = user_id);
        
        RAISE NOTICE 'Created update policy for todos table';
    END IF;
END $$;

-- Check for delete policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'todos' 
        AND policyname = 'Users can delete their own todos'
    ) THEN
        create policy "Users can delete their own todos"
          on todos for delete
          using (auth.user_id() = user_id);
        
        RAISE NOTICE 'Created delete policy for todos table';
    END IF;
END $$; 