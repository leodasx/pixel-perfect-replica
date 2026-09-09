REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_seats_for_show() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid[], numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid[], numeric) TO authenticated;