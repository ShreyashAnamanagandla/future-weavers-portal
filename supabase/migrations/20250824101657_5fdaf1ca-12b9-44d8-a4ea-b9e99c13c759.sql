-- Fix the approve_user function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.approve_user(_email text, _role user_role, _approver_id uuid)
 RETURNS TABLE(access_code text, user_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _access_code TEXT;
  _user_name TEXT;
  _google_id TEXT;
BEGIN
  -- Generate unique access code
  LOOP
    _access_code := public.generate_access_code();
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.approved_users WHERE access_code = _access_code);
  END LOOP;
  
  -- Get user details from pending_users
  SELECT full_name, google_id INTO _user_name, _google_id
  FROM public.pending_users 
  WHERE email = _email;
  
  -- Move user to approved_users
  INSERT INTO public.approved_users (email, full_name, role, access_code, google_id, approved_by)
  VALUES (_email, _user_name, _role, _access_code, _google_id, _approver_id);
  
  -- Remove from pending_users
  DELETE FROM public.pending_users WHERE email = _email;
  
  -- Fix: Explicitly alias the returned columns to match the function signature
  RETURN QUERY SELECT _access_code AS access_code, _user_name AS user_name;
END;
$function$