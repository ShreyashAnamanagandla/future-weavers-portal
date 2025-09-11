-- Fix RLS policies that reference auth.users table
-- This causes "permission denied for table users" errors

-- First, let's create a security definer function to get current user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create a function to get current user google ID
CREATE OR REPLACE FUNCTION public.get_current_user_google_id()
RETURNS TEXT AS $$
  SELECT raw_user_meta_data ->> 'sub' FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Update the approved_users policy that was causing issues
DROP POLICY IF EXISTS "Users can view their own approved record" ON public.approved_users;
CREATE POLICY "Users can view their own approved record" 
ON public.approved_users 
FOR SELECT 
USING (email = public.get_current_user_email());

-- Update the pending_users policy that was causing issues  
DROP POLICY IF EXISTS "Users can view own pending record" ON public.pending_users;
CREATE POLICY "Users can view own pending record" 
ON public.pending_users 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    (google_id IS NOT NULL AND google_id = public.get_current_user_google_id()) 
    OR (email = public.get_current_user_email())
  )
);