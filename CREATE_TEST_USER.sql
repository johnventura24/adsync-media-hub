-- CREATE TEST USER - Run this AFTER the simple auth fix

-- First, let's check if the user already exists
SELECT email, email_confirmed_at FROM auth.users WHERE email = 'admin@hubdashboard.com';

-- If user doesn't exist, create manually in Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Click "Add User"
-- 3. Email: admin@hubdashboard.com
-- 4. Password: admin123456
-- 5. Check "Auto Confirm User"

-- OR try this simpler approach - just confirm existing users:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Create admin profile for the test user (run after creating user in dashboard)
INSERT INTO public.profiles (id, email, first_name, last_name, role, department, is_active)
SELECT 
  au.id,
  au.email,
  'Admin',
  'User',
  'admin',
  'Leadership Team',
  true
FROM auth.users au
WHERE au.email = 'admin@hubdashboard.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  department = 'Leadership Team',
  is_active = true,
  updated_at = NOW();

-- Verify the setup
SELECT 
  au.email,
  au.email_confirmed_at IS NOT NULL as confirmed,
  p.role,
  p.department
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'admin@hubdashboard.com';
