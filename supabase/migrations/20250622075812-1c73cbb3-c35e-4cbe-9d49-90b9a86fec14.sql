
-- Enable RLS on pending_users table and create proper policies
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow Authenticated Inserts" ON public.pending_users;
DROP POLICY IF EXISTS "Admins can manage pending users" ON public.pending_users;

-- Create policy to allow authenticated users to insert their own records
CREATE POLICY "Allow Authenticated Inserts" ON public.pending_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow users to view their own pending records
CREATE POLICY "Users can view own pending record" ON public.pending_users
  FOR SELECT 
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create policy for admins to manage all pending users
CREATE POLICY "Admins can manage all pending users" ON public.pending_users
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
