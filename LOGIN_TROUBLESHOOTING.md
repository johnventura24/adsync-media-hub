# 🔐 LOGIN TROUBLESHOOTING GUIDE

## Common Login Issues & Solutions

### Issue 1: User exists in Supabase but can't log in

#### ✅ **Check User Status in Supabase**

1. **Go to Supabase → Authentication → Users**
2. **Find the user** and check:
   - ✅ **Email Confirmed**: Should show green checkmark
   - ✅ **Status**: Should be "Active" 
   - ✅ **Last Sign In**: Check if it's empty

#### 🔧 **Fix 1: Confirm User Email**

If email is not confirmed:

1. **In Supabase Users table**, click on the user
2. **Click "Confirm User"** button
3. **Or run this SQL**:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@company.com';
```

#### 🔧 **Fix 2: Reset User Password**

1. **In Supabase Users table**, click on the user
2. **Click "Reset Password"**
3. **Or set a new password directly**:
```sql
UPDATE auth.users 
SET encrypted_password = crypt('newpassword123', gen_salt('bf'))
WHERE email = 'user@company.com';
```

#### 🔧 **Fix 3: Check Authentication Settings**

1. **Go to Authentication → Settings**
2. **Verify these settings**:
   - ✅ **Enable email confirmations**: OFF (for testing)
   - ✅ **Site URL**: `https://adsync-media-hub.onrender.com`
   - ✅ **Redirect URLs**: Include your app URL

---

### Issue 2: "Invalid login credentials" error

#### 🔧 **Solution A: Verify Password**

The user might be using the wrong password. Try:

1. **Reset password** in Supabase dashboard
2. **Or set a known password**:
```sql
UPDATE auth.users 
SET encrypted_password = crypt('admin123456', gen_salt('bf'))
WHERE email = 'admin@company.com';
```

#### 🔧 **Solution B: Check Email Format**

Make sure the email is exactly the same:
```sql
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email ILIKE '%company.com%';
```

---

### Issue 3: Authentication not working in the app

#### 🔧 **Check Frontend Authentication**

Let me check if the authentication is properly configured:

1. **Test the login endpoint**:
```bash
curl -X POST https://adsync-media-hub.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123456"}'
```

2. **Check if JWT tokens are being generated**

---

### Issue 4: User can log in but gets redirected back to login

This means the authentication state isn't being maintained.

#### 🔧 **Fix: Check Token Storage**

The app might not be storing JWT tokens properly.

---

## 🚀 **QUICK FIX SOLUTIONS**

### **Method 1: Create a Test User (RECOMMENDED)**

Run this in **Supabase → SQL Editor**:

```sql
-- Delete existing test user if exists
DELETE FROM auth.users WHERE email = 'test@company.com';

-- Create new test user with confirmed email
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
  'test@company.com',
  crypt('test123456', gen_salt('bf')),
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
  '{"first_name": "Test", "last_name": "User"}',
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
);

-- Verify user was created
SELECT email, email_confirmed_at, created_at FROM auth.users WHERE email = 'test@company.com';
```

**Test login with:**
- Email: `test@company.com`
- Password: `test123456`

### **Method 2: Fix Existing User**

If you want to fix the existing user:

```sql
-- Replace 'admin@company.com' with the actual user email
UPDATE auth.users SET 
  email_confirmed_at = NOW(),
  encrypted_password = crypt('admin123456', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'admin@company.com';

-- Create profile for the user if it doesn't exist
INSERT INTO public.profiles (id, email, first_name, last_name, role, department)
SELECT 
  id, 
  email, 
  'Admin', 
  'User', 
  'admin', 
  'Leadership Team'
FROM auth.users 
WHERE email = 'admin@company.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  department = 'Leadership Team';
```

### **Method 3: Disable Authentication Temporarily**

If login still doesn't work, we can temporarily disable authentication:

```sql
-- Check what's in the auth.users table
SELECT 
  email, 
  email_confirmed_at, 
  created_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
ORDER BY created_at DESC;
```

---

## 🔍 **DEBUGGING STEPS**

### **Step 1: Verify User Exists**
```sql
SELECT * FROM auth.users WHERE email = 'your-email@company.com';
```

### **Step 2: Check Profile Exists**
```sql
SELECT * FROM public.profiles WHERE email = 'your-email@company.com';
```

### **Step 3: Test Authentication Endpoint**
```bash
curl -X POST https://adsync-media-hub.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@company.com","password":"your-password"}'
```

### **Step 4: Check Browser Console**
1. **Open browser dev tools** (F12)
2. **Go to Console tab**
3. **Try to log in**
4. **Look for error messages**

---

## 🎯 **MOST LIKELY SOLUTIONS**

1. **Email not confirmed** → Run the confirm user SQL
2. **Wrong password** → Reset password in Supabase
3. **Authentication disabled** → Check if AuthGuard is working
4. **JWT token issues** → Check browser localStorage/cookies

---

## 🚨 **EMERGENCY BYPASS**

If nothing works, temporarily disable authentication:

1. **Edit `client/src/components/Auth/AuthGuard.tsx`**
2. **Add this at the top of the component**:
```javascript
// TEMPORARY: Skip authentication
return <>{children}</>;
```

This will let you access the dashboard while we fix the login issue.

---

## 📞 **NEXT STEPS**

1. **Try Method 1** (create test user) first
2. **Test login** with test@company.com / test123456
3. **If that works**, fix your original user with Method 2
4. **If still not working**, check the debugging steps
5. **Last resort**: Use emergency bypass

Let me know which step fails and I'll help you debug further! 🔧
