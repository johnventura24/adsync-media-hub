# 🔧 RENDER SUPABASE ENVIRONMENT SETUP

## ❌ **PROBLEM IDENTIFIED**
The "Invalid API key" error means Supabase environment variables are not configured on Render.

---

## 🚀 **SOLUTION: Add Environment Variables to Render**

### **Step 1: Get Supabase Credentials**

1. **Go to your Supabase Dashboard**
2. **Click on your project**
3. **Go to Settings → API**
4. **Copy these values:**
   - **Project URL** (starts with `https://`)
   - **anon public key** (starts with `eyJ`)
   - **service_role key** (starts with `eyJ`) - **Keep this secret!**

### **Step 2: Add Environment Variables to Render**

1. **Go to Render Dashboard**
2. **Click on your `adsync-media-hub` service**
3. **Go to "Environment" tab**
4. **Click "Add Environment Variable"**
5. **Add these 3 variables:**

#### **Variable 1:**
- **Key**: `SUPABASE_URL`
- **Value**: `https://your-project-id.supabase.co` (your actual Supabase URL)

#### **Variable 2:**
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: `eyJ...` (your anon public key)

#### **Variable 3:**
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJ...` (your service role key)

6. **Click "Save Changes"**
7. **Render will automatically redeploy** (wait 2-3 minutes)

---

## 🔍 **VERIFICATION STEPS**

### **Step 1: Check Environment Variables**
After deployment, test: `https://adsync-media-hub.onrender.com/api/debug-auth/check-env`

Should show:
```json
{
  "hasSupabaseUrl": true,
  "hasSupabaseAnonKey": true,
  "hasSupabaseServiceKey": true,
  "supabaseUrlPreview": "https://your-project-id.supabase...",
  "nodeEnv": "production"
}
```

### **Step 2: Test Profile Check**
Test: `https://adsync-media-hub.onrender.com/api/debug-auth/check-profile/admin@hubdashboard.com`

Should show:
```json
{
  "email": "admin@hubdashboard.com",
  "profileExists": true,
  "profile": { ... },
  "error": null
}
```

### **Step 3: Try Login Again**
- Go to your app login page
- Email: `admin@hubdashboard.com`
- Password: `admin123456`

---

## 🎯 **ALTERNATIVE: Quick Test Without Environment Setup**

If you want to test the app immediately while setting up Supabase:

### **Temporary Auth Bypass:**

1. **Edit `client/src/components/Auth/AuthGuard.tsx`**
2. **Add this at the very top of the component function:**

```javascript
// TEMPORARY: Skip authentication
return <>{children}</>;
```

3. **Commit and push:**
```bash
git add -A
git commit -m "Temporary auth bypass for testing"
git push origin main
```

This will let you access the dashboard immediately while we fix the Supabase connection.

---

## 📋 **COMMON ISSUES**

### **Issue 1: Can't find Supabase credentials**
- Go to Supabase Dashboard → Your Project → Settings → API
- Make sure you're copying the correct project's credentials

### **Issue 2: Environment variables not working**
- Make sure there are no extra spaces in the keys or values
- Render is case-sensitive: use exact names `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Wait for full deployment after adding variables

### **Issue 3: Still getting "Invalid API key"**
- Check the debug endpoint: `/api/debug-auth/check-env`
- Verify the Supabase URL format: `https://project-id.supabase.co`
- Make sure you're using the anon key, not the service role key for SUPABASE_ANON_KEY

---

## 🚨 **SECURITY NOTE**

- **NEVER** commit Supabase keys to your code
- **ONLY** add them as environment variables in Render
- The **service_role key** has admin access - keep it secret!

---

## ✅ **EXPECTED RESULT**

After adding the environment variables:
1. ✅ `/api/debug-auth/check-env` shows all variables as `true`
2. ✅ `/api/debug-auth/check-profile/admin@hubdashboard.com` finds the profile
3. ✅ Login works with `admin@hubdashboard.com` / `admin123456`
4. ✅ Dashboard loads after successful login

**Start with Step 1 - get your Supabase credentials and add them to Render!** 🔧
