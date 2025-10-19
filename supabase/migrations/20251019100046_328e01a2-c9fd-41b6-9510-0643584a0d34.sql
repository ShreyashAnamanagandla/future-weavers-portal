-- Fix all RLS policies to use get_current_user_email() function instead of direct auth.users queries
-- This prevents "permission denied for table users" errors

-- Drop and recreate policies for access_codes table
DROP POLICY IF EXISTS "Users can verify their own access codes" ON access_codes;
DROP POLICY IF EXISTS "System can update access codes during verification" ON access_codes;

CREATE POLICY "Users can verify their own access codes"
ON access_codes FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  email = get_current_user_email()
);

CREATE POLICY "System can update access codes during verification"
ON access_codes FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  email = get_current_user_email()
);

-- Drop and recreate policies for approved_users table
DROP POLICY IF EXISTS "Users can view their own approved record (no enumeration)" ON approved_users;

CREATE POLICY "Users can view their own approved record (no enumeration)"
ON approved_users FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  email = get_current_user_email()
);

-- Drop and recreate policies for pending_users table
DROP POLICY IF EXISTS "Users can view own pending record" ON pending_users;
DROP POLICY IF EXISTS "Users can insert own pending request (no duplicates)" ON pending_users;

CREATE POLICY "Users can view own pending record"
ON pending_users FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  email = get_current_user_email()
);

CREATE POLICY "Users can insert own pending request (no duplicates)"
ON pending_users FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  email = get_current_user_email() AND
  NOT EXISTS (
    SELECT 1 FROM pending_users 
    WHERE email = get_current_user_email()
  )
);