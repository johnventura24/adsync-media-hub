# 🚀 Render Deployment Configuration

## Manual Setup Instructions

**IMPORTANT**: Render sometimes caches configuration files. Follow these manual steps in your Render dashboard:

### 1. Service Settings
- **Service Type**: Web Service
- **Environment**: Node
- **Plan**: Starter (or higher)
- **Root Directory**: `.` (just a dot)

### 2. Build & Deploy Settings
```
Build Command: npm run build
Start Command: npm start
```

**Alternative if above doesn't work:**
```
Build Command: node deploy.js
Start Command: node server.js
```

### 3. Environment Variables
Set these in your Render dashboard:

**Required:**
- `NODE_ENV` = `production`
- `SUPABASE_URL` = `https://istwwliiuddornffbirt.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzdHd3bGlpdWRkb3JuZmZiaXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDQ3ODYsImV4cCI6MjA3MzEyMDc4Nn0.nVE66L4EbJGC2CWVG19dKf9Sn7rHGVQEkwDTxQhGZ0g`
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzdHd3bGlpdWRkb3JuZmZiaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU0NDc4NiwiZXhwIjoyMDczMTIwNzg2fQ.G6HunKogqeotCYEPAu50p2mtbzWReqpI1Tb3MwHrlWQ`
- `FRONTEND_URL` = `https://adsync-media-hub.onrender.com` (your actual Render URL)

**Optional (with defaults):**
- `JWT_SECRET` = (let Render generate this)
- `JWT_EXPIRES_IN` = `7d`
- `RATE_LIMIT_WINDOW_MS` = `900000`
- `RATE_LIMIT_MAX_REQUESTS` = `100`
- `MAX_FILE_SIZE` = `10485760`
- `UPLOAD_DIR` = `uploads`

### 4. Deployment Steps

1. **Clear Cache**: In Render dashboard, go to Settings → Clear Build Cache
2. **Manual Deploy**: Click "Manual Deploy" → "Deploy latest commit"
3. **Monitor Logs**: Watch the build logs for success messages

### 5. Verification

Once deployed, test these endpoints:
- `https://your-app-url.onrender.com/health` - Health check
- `https://your-app-url.onrender.com/api/status` - API status
- `https://your-app-url.onrender.com` - Main application

### 6. Troubleshooting

If build still fails:
1. Check that "Root Directory" is set to `.` (just a dot)
2. Verify the Build Command exactly matches above
3. Ensure Start Command is `node server.js` (not `npm start`)
4. Clear build cache and redeploy

## 🎯 Key Points
- **No publish directory needed** - we serve static files from Express
- **Root directory must be `.`** - not empty, not `/`, just a dot
- **Start command is `node server.js`** - direct Node execution
- **Build creates `client/build`** - Express serves from there

The application is a full-stack Node.js app, not a static site!
