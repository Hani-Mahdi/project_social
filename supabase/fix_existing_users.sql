-- Create profiles for existing users who signed up before the trigger was added
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  id,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
