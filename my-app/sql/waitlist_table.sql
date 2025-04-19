-- Create waitlist table
CREATE TABLE public.waitlist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'registered')),
  source TEXT DEFAULT 'homepage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  referral_code TEXT,
  notes TEXT
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_emails_updated_at
BEFORE UPDATE ON public.waitlist_emails
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Allow anyone to insert their email (but they can't read, update, or delete)
CREATE POLICY "Allow public to insert emails" ON public.waitlist_emails
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 2. Only allow admins to read all emails
CREATE POLICY "Allow admins to read all emails" ON public.waitlist_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Only allow admins to update status
CREATE POLICY "Allow admins to update emails" ON public.waitlist_emails
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Create index on email for faster lookups
CREATE INDEX waitlist_emails_email_idx ON public.waitlist_emails (email);

-- 5. Create index on status for filtering
CREATE INDEX waitlist_emails_status_idx ON public.waitlist_emails (status);

-- Helpful function to check if an email is already on the waitlist
CREATE OR REPLACE FUNCTION public.is_email_on_waitlist(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.waitlist_emails WHERE email = check_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 