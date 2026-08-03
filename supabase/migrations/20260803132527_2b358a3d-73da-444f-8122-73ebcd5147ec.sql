CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('general','bug','feature')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  rating int CHECK (rating BETWEEN 1 AND 5),
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);