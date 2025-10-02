-- SUPABASE AUTHENTICATION FIX
-- This fixes the authentication system to work with Supabase Auth properly

-- Step 1: Create a view that combines auth.users with profiles
CREATE OR REPLACE VIEW public.users_view AS
SELECT 
  au.id,
  au.email,
  au.encrypted_password as password_hash,
  COALESCE(p.first_name, au.raw_user_meta_data->>'first_name', 'User') as first_name,
  COALESCE(p.last_name, au.raw_user_meta_data->>'last_name', 'Name') as last_name,
  COALESCE(p.role, 'member') as role,
  COALESCE(p.department, 'General') as department,
  COALESCE(p.position, '') as position,
  COALESCE(p.phone, '') as phone,
  COALESCE(p.is_active, true) as is_active,
  au.email_confirmed_at,
  au.created_at,
  au.updated_at,
  au.last_sign_in_at as last_login
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email_confirmed_at IS NOT NULL;

-- Step 2: Create or update profiles table to match auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'member',
  department VARCHAR(100),
  position VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create profiles for existing users who don't have them
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'last_name', 'Name'),
  'member'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 8: Create a test admin user that will definitely work
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@hubdashboard.com',
    crypt('admin123456', gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "Admin", "last_name": "User"}',
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  )
  ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('admin123456', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO user_id;

  -- Insert/update profile
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
END $$;

-- Step 9: Verify everything is set up correctly
SELECT 'Setup completed successfully!' as message;

-- Check auth users
SELECT 'Auth Users:' as section, email, email_confirmed_at IS NOT NULL as confirmed 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check profiles
SELECT 'Profiles:' as section, email, role, department, is_active 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Check the combined view
SELECT 'Combined View:' as section, email, role, is_active 
FROM public.users_view 
ORDER BY created_at DESC 
LIMIT 5;
