-- Fix critical security vulnerability in pending_users RLS policy
-- Remove the "OR true" condition that exposes all user data publicly

DROP POLICY IF EXISTS "Users can view own pending record" ON public.pending_users;

-- Create a proper policy that only allows users to view their own records
CREATE POLICY "Users can view own pending record" ON public.pending_users
FOR SELECT USING (
  -- Only allow viewing if the user's Google ID matches or if the user is authenticated and matches the ID
  (auth.uid() IS NOT NULL AND (
    (google_id IS NOT NULL AND google_id = (
      SELECT raw_user_meta_data->>'sub' 
      FROM auth.users 
      WHERE id = auth.uid()
    )) OR
    (email = (
      SELECT email 
      FROM auth.users 
      WHERE id = auth.uid()
    ))
  ))
);

-- Also create a proper policy for admins to manage pending users
CREATE POLICY "Admins can view all pending users" ON public.pending_users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::user_role
  )
);