# Deployment Guide

This guide will help you deploy the Hub Dashboard application to Render with Supabase as the database.

## Prerequisites

1. **GitHub Account** - For code repository
2. **Render Account** - For hosting (render.com)
3. **Supabase Account** - For database (supabase.com)

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in and create a new project
3. Choose a name and password for your database
4. Wait for the project to be created

### 1.2 Set Up Database Schema
1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Paste and run the SQL to create all tables and functions

### 1.3 Get Database Credentials
From your Supabase project settings, note down:
- Project URL
- Anon (public) key  
- Service role (secret) key

## Step 2: Code Repository Setup

### 2.1 Create GitHub Repository
1. Create a new repository on GitHub
2. Push your code to the repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/hub-dashboard.git
git push -u origin main
```

## Step 3: Deploy to Render

### 3.1 Create Web Service
1. Go to [render.com](https://render.com) and sign in
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: hub-dashboard
   - **Environment**: Node
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 3.2 Set Environment Variables
In the Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_generated_jwt_secret_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app-name.onrender.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

**Important**: 
- Replace `your_supabase_*` with actual values from Supabase
- Generate a strong JWT secret (you can use: `openssl rand -base64 32`)
- Replace `your-app-name` with your actual Render app name

### 3.3 Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. The build process will take a few minutes

## Step 4: Post-Deployment Setup

### 4.1 Create Initial Admin User
Once deployed, you can:
1. Visit your application URL
2. Register a new account
3. Manually update the user role to 'admin' in Supabase:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 4.2 Create Sample Organization
1. Create an organization in Supabase:

```sql
INSERT INTO organizations (id, name, description, industry) 
VALUES (gen_random_uuid(), 'Your Company', 'Sample organization', 'Technology');
```

2. Add your user to the organization:

```sql
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT u.id, o.id, 'admin'
FROM users u, organizations o 
WHERE u.email = 'your-email@example.com' 
AND o.name = 'Your Company';
```

## Step 5: Import Data from Ninety.io

### 5.1 Export Data from Ninety.io
1. Log into your Ninety.io account
2. Export your data as CSV files:
   - Users/Team members
   - Rocks/Goals
   - To-dos/Tasks
   - Issues
   - Scorecards

### 5.2 Import Data
1. Go to the Import page in your Hub Dashboard
2. Upload each CSV file using the import functionality
3. Map the columns appropriately
4. Review and confirm the import

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain in Render
1. Go to your service settings in Render
2. Add your custom domain
3. Configure DNS records as instructed by Render

### 6.2 Update Environment Variables
Update the `FRONTEND_URL` environment variable to use your custom domain.

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all environment variables are set
   - Verify Node.js version compatibility
   - Check the build logs for specific errors

2. **Database Connection Issues**
   - Verify Supabase credentials
   - Ensure database schema is properly set up
   - Check if IP restrictions are configured in Supabase

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check FRONTEND_URL matches your deployed URL
   - Ensure CORS is properly configured

### Health Check
Visit `https://your-app-name.onrender.com/health` to verify the server is running.

### Logs
Check the logs in Render dashboard for detailed error information.

## Scaling Considerations

### For 50+ Users
- Consider upgrading to Render's Professional plan for better performance
- Monitor database performance in Supabase
- Implement caching strategies if needed
- Consider setting up monitoring and alerts

### Performance Optimization
- Enable gzip compression (already configured)
- Implement CDN for static assets
- Optimize database queries
- Add database indexes for frequently queried data

## Security Checklist

- [ ] Strong JWT secret generated
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] HTTPS enabled (automatic with Render)
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] File upload restrictions set

## Backup Strategy

### Database Backups
1. Supabase automatically creates daily backups
2. Consider setting up additional backup procedures for critical data
3. Test restore procedures regularly

### Code Backups
- Code is automatically backed up in GitHub
- Consider creating release tags for major versions

## Support

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review Render and Supabase documentation
3. Check application logs for specific errors
4. Create an issue in the GitHub repository

---

**Congratulations!** Your Hub Dashboard is now deployed and ready to replace Ninety.io for your organization.
