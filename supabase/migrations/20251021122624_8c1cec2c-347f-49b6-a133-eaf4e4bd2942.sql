-- Phase 1: Critical Database Fixes for Production Readiness
-- Fix 1.1: Add INSERT policy to profiles table (CRITICAL - blocks new user registration)
-- Fix 1.2: Create secure access code verification function
-- Fix 1.3: Remove legacy role column from profiles

-- Fix 1.1: Allow users to create their own profile (but NOT set role)
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
WITH CHECK (
  auth.uid() = id AND
  auth.uid() IS NOT NULL
);

-- Fix 1.2: Create secure access code verification function with constant-time responses
CREATE OR REPLACE FUNCTION public.verify_access_code_secure(_email TEXT, _code TEXT)
RETURNS TABLE(
  success BOOLEAN,
  role public.user_role,
  code_id UUID,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code_id UUID;
  v_role public.user_role;
  v_approved_user_id UUID;
  v_full_name TEXT;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user ID and email
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Verify user is authenticated
  IF v_user_id IS NULL THEN
    PERFORM pg_sleep(0.1);  -- Constant-time response
    RETURN QUERY SELECT false, NULL::public.user_role, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if email matches authenticated user (prevent enumeration)
  IF _email != v_user_email THEN
    PERFORM pg_sleep(0.1);  -- Constant-time response
    RETURN QUERY SELECT false, NULL::public.user_role, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Look up access code (only for matching email)
  SELECT ac.id, ac.role
  INTO v_code_id, v_role
  FROM public.access_codes ac
  WHERE ac.email = _email
    AND ac.code = _code
    AND ac.is_used = false;

  -- If no valid code found, return false (constant-time)
  IF v_code_id IS NULL THEN
    PERFORM pg_sleep(0.1);
    RETURN QUERY SELECT false, NULL::public.user_role, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Mark code as used
  UPDATE public.access_codes
  SET is_used = true, used_at = now()
  WHERE id = v_code_id;

  -- Get user details from approved_users
  SELECT au.id, au.full_name
  INTO v_approved_user_id, v_full_name
  FROM public.approved_users au
  WHERE au.email = _email;

  -- Assign role to user in user_roles table (NOT profiles!)
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (v_user_id, v_role, v_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Return success with role info
  RETURN QUERY SELECT true, v_role, v_code_id, v_full_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_access_code_secure TO authenticated;

-- Fix 1.3: Remove legacy role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;