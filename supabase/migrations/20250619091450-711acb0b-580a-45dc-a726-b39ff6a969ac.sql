
-- Create pending_users table for users awaiting approval
CREATE TABLE public.pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  google_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create approved_users table for approved users with access codes
CREATE TABLE public.approved_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  google_id TEXT,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES public.profiles(id),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_users
CREATE POLICY "Admins can manage pending users" ON public.pending_users
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for approved_users  
CREATE POLICY "Admins can manage approved users" ON public.approved_users
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own approved record" ON public.approved_users
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Function to generate random 6-digit access code
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
$$;

-- Function to approve a pending user
CREATE OR REPLACE FUNCTION public.approve_user(_email TEXT, _role user_role, _approver_id UUID)
RETURNS TABLE(access_code TEXT, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  RETURN QUERY SELECT _access_code, _user_name;
END;
$$;

-- Function to verify user login
CREATE OR REPLACE FUNCTION public.verify_user_login(_email TEXT, _access_code TEXT)
RETURNS TABLE(role user_role, user_id UUID, full_name TEXT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT au.role, au.id, au.full_name
  FROM public.approved_users au
  WHERE au.email = _email 
    AND au.access_code = _access_code;
$$;

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_last_login(_email TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.approved_users 
  SET last_login = NOW()
  WHERE email = _email;
$$;
