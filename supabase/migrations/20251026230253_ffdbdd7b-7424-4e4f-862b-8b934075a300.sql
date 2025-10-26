-- Step 1: Add unique constraint to access_codes table
ALTER TABLE public.access_codes 
ADD CONSTRAINT access_codes_email_code_unique UNIQUE (email, code);

-- Step 2: Update approve_user() function to insert into BOTH tables
CREATE OR REPLACE FUNCTION public.approve_user(_email text, _role user_role, _approver_id uuid)
RETURNS TABLE(access_code text, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    ) AND NOT EXISTS(
      SELECT 1 FROM public.access_codes ac WHERE ac.code = generated_access_code
    );
  END LOOP;
  
  -- Get user details from pending_users
  SELECT pu.full_name, pu.google_id 
  INTO pending_user_name, pending_google_id
  FROM public.pending_users pu 
  WHERE pu.email = _email;
  
  IF pending_user_name IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in pending users', _email;
  END IF;
  
  -- Move user to approved_users
  INSERT INTO public.approved_users (email, full_name, role, access_code, google_id, approved_by)
  VALUES (_email, pending_user_name, _role, generated_access_code, pending_google_id, _approver_id);
  
  -- Insert into access_codes table
  INSERT INTO public.access_codes (email, code, role, created_by)
  VALUES (_email, generated_access_code, _role, _approver_id);
  
  -- Remove from pending_users
  DELETE FROM public.pending_users pu WHERE pu.email = _email;
  
  RETURN QUERY 
  SELECT generated_access_code::text AS access_code, 
         COALESCE(pending_user_name, _email)::text AS user_name;
END;
$$;

-- Step 3: Migrate existing unused access codes from approved_users to access_codes
INSERT INTO public.access_codes (email, code, role, created_by, is_used)
SELECT 
  au.email,
  au.access_code,
  au.role,
  au.approved_by,
  false
FROM public.approved_users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.access_codes ac 
  WHERE ac.email = au.email AND ac.code = au.access_code
)
ON CONFLICT (email, code) DO NOTHING;