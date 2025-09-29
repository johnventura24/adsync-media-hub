# 👥 HOW TO CREATE USERS IN SUPABASE

## ✅ Step 1: Run the Fixed SQL Setup

1. **Go to your Supabase project**: https://supabase.com
2. **Select your project**: `adsync-media-hub`
3. **Go to SQL Editor**
4. **Copy and paste the contents of `SUPABASE_FIXED_SETUP.sql`**
5. **Click "Run"**

## ✅ Step 2: Create Users via Supabase Dashboard

### Method 1: Using Supabase Auth Interface (RECOMMENDED)

1. **Go to Authentication → Users** in your Supabase dashboard
2. **Click "Add User"** button
3. **Fill in the form**:
   - **Email**: `admin@yourcompany.com` (change to your email)
   - **Password**: `admin123456` (use a strong password)
   - **Auto Confirm User**: ✅ Check this box
4. **Click "Create User"**

### Method 2: Create Multiple Users at Once

For each team member, repeat the process:

**Example Users to Create:**
```
Email: john.smith@yourcompany.com
Password: TempPass123!
Role: manager
Department: Sales Team

Email: jane.doe@yourcompany.com  
Password: TempPass123!
Role: member
Department: Creative Team

Email: admin@yourcompany.com
Password: AdminPass123!
Role: admin
Department: Leadership Team
```

## ✅ Step 3: Update User Profiles

After creating users in the Auth interface, you need to update their profiles:

1. **Go to Table Editor → profiles**
2. **Find each user by email**
3. **Click "Edit"** and update:
   - **first_name**: User's first name
   - **last_name**: User's last name
   - **role**: `admin`, `manager`, or `member`
   - **department**: Choose from:
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
   - **position**: Job title
   - **is_active**: ✅ true

## ✅ Step 4: Test Login

1. **Go to your app**: https://adsync-media-hub.onrender.com/login
2. **Use the credentials you created**:
   - Email: `admin@yourcompany.com`
   - Password: `AdminPass123!`
3. **Should successfully log in**

## 🚨 IMPORTANT NOTES:

### User Roles:
- **admin**: Can see and manage everything
- **manager**: Can manage team data and users  
- **member**: Can view and edit own data only

### Password Requirements:
- Minimum 6 characters
- Include letters and numbers
- Users can change passwords after first login

### Department Assignment:
- Users will only see data from their department
- Admins see all departments
- Make sure to assign correct departments

## 🔧 Troubleshooting:

### If user creation fails:
1. **Check email format** (must be valid email)
2. **Check password strength** (at least 6 characters)
3. **Make sure "Auto Confirm User" is checked**

### If login fails:
1. **Verify user exists** in Authentication → Users
2. **Check if user is confirmed** (should show green checkmark)
3. **Try password reset** if needed

### If profile not created:
1. **Check Table Editor → profiles**
2. **Manually create profile** if trigger didn't work:
   ```sql
   INSERT INTO public.profiles (id, email, first_name, last_name, role, department)
   VALUES (
     'USER_ID_FROM_AUTH_USERS',
     'user@company.com',
     'First',
     'Last', 
     'member',
     'Creative Team'
   );
   ```

## 🎯 Quick Start Checklist:

- [ ] Run the fixed SQL setup script
- [ ] Create admin user via Supabase Auth
- [ ] Update admin profile with role='admin'
- [ ] Create 2-3 test users
- [ ] Assign departments and roles
- [ ] Test login with admin user
- [ ] Test login with regular user
- [ ] Verify role-based access works

**After completing these steps, your authentication system will be fully functional!** 🚀
