CREATE TABLE public.activity_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  files_analysed integer NOT NULL DEFAULT 0,
  files_preprocessed integer NOT NULL DEFAULT 0,
  files_visualized integer NOT NULL DEFAULT 0,
  files_exported integer NOT NULL DEFAULT 0,
  ml_readiness_runs integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.activity_stats TO authenticated;
GRANT ALL ON public.activity_stats TO service_role;

ALTER TABLE public.activity_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity stats"
  ON public.activity_stats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity stats"
  ON public.activity_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity stats"
  ON public.activity_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_activity_stat(_metric text)
RETURNS public.activity_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.activity_stats;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _metric NOT IN ('files_analysed','files_preprocessed','files_visualized','files_exported','ml_readiness_runs') THEN
    RAISE EXCEPTION 'Invalid metric %', _metric;
  END IF;

  INSERT INTO public.activity_stats (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  EXECUTE format(
    'UPDATE public.activity_stats SET %I = %I + 1, updated_at = now() WHERE user_id = $1 RETURNING *',
    _metric, _metric
  ) INTO result USING auth.uid();

  RETURN result;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_stats;