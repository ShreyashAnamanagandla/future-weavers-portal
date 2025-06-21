
-- Remove the problematic handle_new_user function and trigger that's causing OAuth failures
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
