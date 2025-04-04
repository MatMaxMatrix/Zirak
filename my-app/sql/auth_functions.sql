-- Create a function to extract userId from JWT claims
create or replace function auth.user_id() returns text as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'userId', '')::text;
$$ language sql stable;

-- Create policy for todos table (if you're using a todo example)
-- You need to run this on the Supabase SQL editor
create policy "Users can view their own todos"
  on todo for select
  using (auth.user_id() = user_id);

create policy "Users can insert their own todos"
  on todo for insert
  with check (auth.user_id() = user_id);

create policy "Users can update their own todos"
  on todo for update
  using (auth.user_id() = user_id);

create policy "Users can delete their own todos"
  on todo for delete
  using (auth.user_id() = user_id); 