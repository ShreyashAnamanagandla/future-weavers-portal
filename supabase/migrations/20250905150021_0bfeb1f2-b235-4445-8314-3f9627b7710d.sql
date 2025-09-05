-- Fix database function security issues by setting search_path
ALTER FUNCTION public.approve_user(_email text, _role user_role, _approver_id uuid) SET search_path = 'public';
ALTER FUNCTION public.verify_user_login(_email text, _access_code text) SET search_path = 'public';  
ALTER FUNCTION public.update_last_login(_email text) SET search_path = 'public';
ALTER FUNCTION public.has_role(_user_id uuid, _role user_role) SET search_path = 'public';
ALTER FUNCTION public.generate_access_code() SET search_path = 'public';
ALTER FUNCTION public.use_access_code(_code_id uuid) SET search_path = 'public';
ALTER FUNCTION public.verify_access_code(_email text, _code text) SET search_path = 'public';