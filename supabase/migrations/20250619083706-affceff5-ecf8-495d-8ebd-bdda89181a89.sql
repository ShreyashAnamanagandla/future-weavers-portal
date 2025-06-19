
-- Create a table for access codes
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on access_codes table
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for access_codes
CREATE POLICY "Admins can manage all access codes" ON public.access_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own access codes" ON public.access_codes
  FOR SELECT USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Insert some sample access codes for testing
INSERT INTO public.access_codes (email, code, role) VALUES
  ('admin@example.com', '123456', 'admin'),
  ('mentor@example.com', '789012', 'mentor'),
  ('intern@example.com', '345678', 'intern');

-- Create function to verify access code
CREATE OR REPLACE FUNCTION public.verify_access_code(_email TEXT, _code TEXT)
RETURNS TABLE(role user_role, code_id UUID)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT ac.role, ac.id
  FROM public.access_codes ac
  WHERE ac.email = _email 
    AND ac.code = _code 
    AND ac.is_used = false;
$$;

-- Create function to mark access code as used
CREATE OR REPLACE FUNCTION public.use_access_code(_code_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.access_codes 
  SET is_used = true, used_at = NOW()
  WHERE id = _code_id
  RETURNING true;
$$;
