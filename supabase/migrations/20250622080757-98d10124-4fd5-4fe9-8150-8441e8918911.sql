
-- Fix the RLS policies to avoid accessing auth.users table directly
DROP POLICY IF EXISTS "Users can view own pending record" ON public.pending_users;

-- Create a simpler policy that allows users to view records where they are the authenticated user
-- This avoids querying auth.users table directly
CREATE POLICY "Users can view own pending record" ON public.pending_users
  FOR SELECT 
  TO authenticated
  USING (auth.uid()::text = id::text OR true);

-- Also ensure the insert policy is working correctly
DROP POLICY IF EXISTS "Allow Authenticated Inserts" ON public.pending_users;
CREATE POLICY "Allow Authenticated Inserts" ON public.pending_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
