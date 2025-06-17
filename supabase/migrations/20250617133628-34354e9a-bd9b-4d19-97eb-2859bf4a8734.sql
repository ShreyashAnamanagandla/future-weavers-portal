
-- Create enum types for user roles and other categorizations
CREATE TYPE public.user_role AS ENUM ('admin', 'mentor', 'intern');
CREATE TYPE public.badge_type AS ENUM ('milestone', 'skill', 'achievement', 'completion');
CREATE TYPE public.progress_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected');
CREATE TYPE public.certificate_status AS ENUM ('draft', 'approved', 'issued');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'intern',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 12,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress table
CREATE TABLE public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES public.profiles(id) NOT NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  mentor_id UUID REFERENCES public.profiles(id),
  status progress_status DEFAULT 'pending',
  submission_notes TEXT,
  mentor_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type badge_type NOT NULL DEFAULT 'achievement',
  criteria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_badges table (many-to-many relationship)
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  badge_id UUID REFERENCES public.badges(id) NOT NULL,
  awarded_by UUID REFERENCES public.profiles(id) NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES public.profiles(id) NOT NULL,
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  mentor_id UUID REFERENCES public.profiles(id),
  status certificate_status DEFAULT 'draft',
  certificate_data JSONB,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendations table
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES public.profiles(id) NOT NULL,
  mentor_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT,
  linkedin_template TEXT,
  is_draft BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(intern_id, mentor_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'intern')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors can view intern profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'mentor') AND role = 'intern'
  );

-- RLS Policies for projects
CREATE POLICY "Admins can manage projects" ON public.projects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for milestones
CREATE POLICY "Admins can manage milestones" ON public.milestones
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view milestones" ON public.milestones
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for progress
CREATE POLICY "Interns can view their own progress" ON public.progress
  FOR SELECT USING (auth.uid() = intern_id);

CREATE POLICY "Interns can update their own progress" ON public.progress
  FOR UPDATE USING (auth.uid() = intern_id);

CREATE POLICY "Mentors can view assigned intern progress" ON public.progress
  FOR SELECT USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can review assigned intern progress" ON public.progress
  FOR UPDATE USING (auth.uid() = mentor_id);

CREATE POLICY "Admins can manage all progress" ON public.progress
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for badges
CREATE POLICY "Everyone can view badges" ON public.badges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage badges" ON public.badges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Mentors can award badges to interns" ON public.user_badges
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'mentor') AND
    auth.uid() = awarded_by
  );

CREATE POLICY "Admins can manage all user badges" ON public.user_badges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for certificates
CREATE POLICY "Interns can view their own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = intern_id);

CREATE POLICY "Mentors can view assigned intern certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = mentor_id);

CREATE POLICY "Admins can manage all certificates" ON public.certificates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recommendations
CREATE POLICY "Interns can view their own recommendations" ON public.recommendations
  FOR SELECT USING (auth.uid() = intern_id);

CREATE POLICY "Mentors can manage recommendations for their interns" ON public.recommendations
  FOR ALL USING (auth.uid() = mentor_id);

CREATE POLICY "Admins can view all recommendations" ON public.recommendations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Insert some default badges
INSERT INTO public.badges (name, description, badge_type, criteria) VALUES
  ('First Steps', 'Completed first milestone', 'milestone', 'Complete the first milestone of any project'),
  ('Quick Learner', 'Completed milestone ahead of schedule', 'achievement', 'Complete any milestone before due date'),
  ('Team Player', 'Excellent collaboration skills', 'skill', 'Demonstrated strong teamwork and communication'),
  ('Problem Solver', 'Creative solutions to challenges', 'skill', 'Showed innovative problem-solving approach'),
  ('Project Complete', 'Successfully completed internship project', 'completion', 'Complete all milestones in a project');
