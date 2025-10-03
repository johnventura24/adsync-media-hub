-- VERIFY USER SETUP - Run this to check if everything is working

-- 1. Check if profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- 2. Check if the test user exists in auth.users
SELECT 
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'admin@hubdashboard.com';

-- 3. Check if the profile exists
SELECT 
  email,
  first_name,
  last_name,
  role,
  department,
  is_active,
  created_at
FROM public.profiles 
WHERE email = 'admin@hubdashboard.com';

-- 4. Check if RLS is enabled on profiles
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 5. List all policies on profiles table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- If the profile doesn't exist, create it:
-- INSERT INTO public.profiles (id, email, first_name, last_name, role, department, is_active)
-- SELECT 
--   au.id,
--   au.email,
--   'Admin',
--   'User',
--   'admin',
--   'Leadership Team',
--   true
-- FROM auth.users au
-- WHERE au.email = 'admin@hubdashboard.com'
-- ON CONFLICT (id) DO UPDATE SET
--   role = 'admin',
--   department = 'Leadership Team',
--   is_active = true;
