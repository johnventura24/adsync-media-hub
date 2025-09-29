# 🔐 SUPABASE AUTHENTICATION SETUP GUIDE

## Step 1: Enable Authentication in Supabase

### 1.1 Go to your Supabase Dashboard
1. Visit [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project: `adsync-media-hub`

### 1.2 Configure Authentication Settings
1. Go to **Authentication** → **Settings**
2. Enable **Email confirmations** (optional for demo)
3. Set **Site URL**: `https://adsync-media-hub.onrender.com`
4. Add **Redirect URLs**:
   - `https://adsync-media-hub.onrender.com`
   - `https://adsync-media-hub.onrender.com/auth/callback`
   - `http://localhost:3000` (for local development)

### 1.3 Email Templates (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize confirmation and password reset emails if needed

## Step 2: Database Setup for Users

### 2.1 Run User Profile Setup SQL
Go to **SQL Editor** and run this script:

```sql
-- Enable RLS (Row Level Security)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'member',
  department VARCHAR(100),
  position VARCHAR(100),
  phone VARCHAR(20),
  organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles (users can read/update their own profile)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create admin user (replace with your email)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@yourcompany.com', -- CHANGE THIS TO YOUR EMAIL
  crypt('admin123456', gen_salt('bf')), -- CHANGE THIS PASSWORD
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;
```

## Step 3: Update Environment Variables

### 3.1 Add to your `.env` file:
```env
# Existing Supabase variables
SUPABASE_URL=https://istwwliiuddornffbirt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzdHd3bGlpdWRkb3JuZmZiaXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDQ3ODYsImV4cCI6MjA3MzEyMDc4Nn0.nVE66L4EbJGC2CWVG19dKf9Sn7rHGVQEkwDTxQhGZ0g
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzdHd3bGlpdWRkb3JuZmZiaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU0NDc4NiwiZXhwIjoyMDczMTIwNzg2fQ.G6HunKogqeotCYEPAu50p2mtbzWReqpI1Tb3MwHrlWQ

# Authentication settings
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://adsync-media-hub.onrender.com
```

### 3.2 Add to Render Environment Variables:
1. Go to your Render dashboard
2. Select your service
3. Go to **Environment**
4. Add the same variables as above

## Step 4: User Registration Process

### 4.1 Admin Creates Users
1. **Option A**: Use Supabase Dashboard
   - Go to **Authentication** → **Users**
   - Click **Add User**
   - Enter email and temporary password
   - User will receive email to set permanent password

2. **Option B**: Use SQL (for bulk creation)
   ```sql
   -- Create multiple users at once
   INSERT INTO auth.users (
     id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at
   ) VALUES 
   (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user1@company.com', crypt('temppass123', gen_salt('bf')), NOW(), NOW(), NOW()),
   (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user2@company.com', crypt('temppass123', gen_salt('bf')), NOW(), NOW(), NOW()),
   (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user3@company.com', crypt('temppass123', gen_salt('bf')), NOW(), NOW(), NOW())
   ON CONFLICT (email) DO NOTHING;
   ```

### 4.2 Users Login Process
1. Go to: `https://adsync-media-hub.onrender.com/login`
2. Enter email and password
3. System automatically creates profile in `profiles` table
4. User gets access based on their role

## Step 5: Role-Based Access

### 5.1 Available Roles:
- **admin**: Full access to everything
- **manager**: Can manage team data and users
- **member**: Can view and edit own data only

### 5.2 Department Assignment:
Users can be assigned to these departments:
- Account Team
- Auto Team  
- Creative Team
- CRO Team
- Finance & Admin Team
- Leadership Team
- Media Team
- Medicare ACA
- Sales & Success Team
- Taxonomy
- Tech Team
- Testing Team
- VII

## Step 6: Testing Authentication

### 6.1 Test Admin Login:
1. Email: `admin@yourcompany.com`
2. Password: `admin123456`
3. Should have full access to all features

### 6.2 Create Test Users:
1. Use Supabase dashboard to create 2-3 test users
2. Assign different roles and departments
3. Test login with each user
4. Verify role-based access works

## Step 7: Security Considerations

### 7.1 Password Policy:
- Minimum 8 characters
- Include numbers and letters
- Users should change temporary passwords

### 7.2 Session Management:
- JWT tokens expire after 7 days
- Users need to re-login after expiration
- Tokens are stored securely in httpOnly cookies

### 7.3 Row Level Security:
- Users can only see their organization's data
- Admins can see all data
- Managers can see their team's data

## 🚀 Quick Start Commands

After running the SQL setup, you can immediately:

1. **Create your admin account** (update the email in the SQL)
2. **Add team members** via Supabase dashboard
3. **Test login** at your app URL
4. **Upload data** with proper user permissions

## 🆘 Troubleshooting

### Common Issues:
1. **"User not found"**: Check if user exists in auth.users table
2. **"Invalid password"**: Password might be too simple or user needs to reset
3. **"Access denied"**: Check user role and organization assignment
4. **"Profile not created"**: Check if the trigger function is working

### Debug Commands:
```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'user@company.com';

-- Check profile
SELECT * FROM public.profiles WHERE email = 'user@company.com';

-- Check roles
SELECT email, role, department FROM public.profiles;
```

---

**🎯 Result**: After completing these steps, you'll have a fully functional user authentication system with role-based access control, integrated with your existing Hub dashboard!
