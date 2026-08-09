REVOKE EXECUTE ON FUNCTION public.increment_activity_stat(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_activity_stat(text) TO authenticated;