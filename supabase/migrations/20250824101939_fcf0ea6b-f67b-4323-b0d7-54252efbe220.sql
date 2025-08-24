-- Completely rewrite the approve_user function to fix ambiguous column references
DROP FUNCTION IF EXISTS public.approve_user(_email text, _role user_role, _approver_id uuid);

CREATE OR REPLACE FUNCTION public.approve_user(_email text, _role user_role, _approver_id uuid)
RETURNS TABLE(access_code text, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  generated_access_code TEXT;
  pending_user_name TEXT;
  pending_google_id TEXT;
BEGIN
  -- Generate unique access code
  LOOP
    generated_access_code := public.generate_access_code();
    EXIT WHEN NOT EXISTS(
      SELECT 1 FROM public.approved_users au WHERE au.access_code = generated_access_code
    );
  END LOOP;
  
  -- Get user details from pending_users
  SELECT pu.full_name, pu.google_id 
  INTO pending_user_name, pending_google_id
  FROM public.pending_users pu 
  WHERE pu.email = _email;
  
  -- Check if user exists in pending_users
  IF pending_user_name IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in pending users', _email;
  END IF;
  
  -- Move user to approved_users
  INSERT INTO public.approved_users (email, full_name, role, access_code, google_id, approved_by)
  VALUES (_email, pending_user_name, _role, generated_access_code, pending_google_id, _approver_id);
  
  -- Remove from pending_users
  DELETE FROM public.pending_users pu WHERE pu.email = _email;
  
  -- Return the results with explicit column names
  RETURN QUERY 
  SELECT generated_access_code::text AS access_code, 
         COALESCE(pending_user_name, _email)::text AS user_name;
END;
$function$