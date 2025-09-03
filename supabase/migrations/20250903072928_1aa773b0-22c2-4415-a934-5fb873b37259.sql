-- Add missing INSERT policy for progress table to allow interns to start progress tracking
CREATE POLICY "Interns can create their own progress" 
ON public.progress 
FOR INSERT 
WITH CHECK (auth.uid() = intern_id);

-- Also allow admins to create progress records for any intern
CREATE POLICY "Admins can create progress for any intern" 
ON public.progress 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));