-- ==========================================
-- CRITICAL SECURITY FIX: Separate roles from profiles
-- ==========================================

-- 1. Verify user_role enum exists and create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role 
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'mentor' THEN 2
      WHEN 'intern' THEN 3
    END
  LIMIT 1
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT id, role, id
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create mentor_assignments table
CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(mentor_id, intern_id)
);

ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS Policies for mentor_assignments
CREATE POLICY "Mentors can view their assignments"
ON public.mentor_assignments FOR SELECT
USING (auth.uid() = mentor_id OR auth.uid() = intern_id);

CREATE POLICY "Admins can manage all assignments"
ON public.mentor_assignments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Update profiles RLS policies (CRITICAL FIX: Require authentication)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Mentors can view intern profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Admins can view all profiles (authenticated)"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors can view assigned intern profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.has_role(auth.uid(), 'mentor') AND
  EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE mentor_id = auth.uid() AND intern_id = profiles.id
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 9. Update access_codes RLS policies (CRITICAL FIX: Prevent enumeration + allow verification)
DROP POLICY IF EXISTS "Admins can manage all access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Users can view their own access codes" ON public.access_codes;

CREATE POLICY "Admins can manage all access codes"
ON public.access_codes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can verify their own access codes"
ON public.access_codes FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "System can update access codes during verification"
ON public.access_codes FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 10. Update approved_users RLS policies
DROP POLICY IF EXISTS "Admins can manage approved users" ON public.approved_users;
DROP POLICY IF EXISTS "Users can view their own approved record" ON public.approved_users;

CREATE POLICY "Admins can manage approved users"
ON public.approved_users FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own approved record (no enumeration)"
ON public.approved_users FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 11. Update pending_users RLS policies (CRITICAL FIX: Prevent spam)
DROP POLICY IF EXISTS "Allow Authenticated Inserts" ON public.pending_users;
DROP POLICY IF EXISTS "Users can view own pending record" ON public.pending_users;
DROP POLICY IF EXISTS "Admins can manage all pending users" ON public.pending_users;
DROP POLICY IF EXISTS "Admins can view all pending users" ON public.pending_users;

CREATE POLICY "Users can insert own pending request (no duplicates)"
ON public.pending_users FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND
  NOT EXISTS (
    SELECT 1 FROM public.pending_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can view own pending record"
ON public.pending_users FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage all pending users"
ON public.pending_users FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 12. Update progress RLS policies
DROP POLICY IF EXISTS "Interns can view their own progress" ON public.progress;
DROP POLICY IF EXISTS "Mentors can view assigned intern progress" ON public.progress;
DROP POLICY IF EXISTS "Mentors can review assigned intern progress" ON public.progress;

CREATE POLICY "Interns can view their own progress"
ON public.progress FOR SELECT
USING (auth.uid() = intern_id);

CREATE POLICY "Mentors can view assigned intern progress"
ON public.progress FOR SELECT
USING (
  public.has_role(auth.uid(), 'mentor') AND
  EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE mentor_id = auth.uid() AND intern_id = progress.intern_id
  )
);

CREATE POLICY "Mentors can review assigned intern progress"
ON public.progress FOR UPDATE
USING (
  public.has_role(auth.uid(), 'mentor') AND
  EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE mentor_id = auth.uid() AND intern_id = progress.intern_id
  )
);

-- 13. Update user_badges RLS policies
DROP POLICY IF EXISTS "Mentors can award badges to interns" ON public.user_badges;

CREATE POLICY "Mentors can award badges to assigned interns"
ON public.user_badges FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'mentor') AND
  auth.uid() = awarded_by AND
  EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE mentor_id = auth.uid() AND intern_id = user_badges.user_id
  )
);

-- 14. Create function to check if admin exists (for bootstrap)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'admin'
  )
$$;