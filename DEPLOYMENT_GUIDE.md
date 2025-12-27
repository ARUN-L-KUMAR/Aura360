# 🚀 Deployment Guide - NeonDB Migration

## ✅ Changes Made

Your project has been successfully migrated from Supabase to NeonDB. All code changes are complete!

---

## 📋 What You Need to Do Now

### 1. **Update Your Deployment Platform Environment Variables**

If you're deploying to **Vercel**, **Netlify**, or another platform, you MUST update the environment variables:

#### ❌ **Remove These (Supabase):**
```env
NEXT_PUBLIC_SUPABASE_URL = https://hphgbqvzwcpcncaqvfyw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaGdicXZ6d2NwY25jYXF2Znl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTM1NjcsImV4cCI6MjA3NTU4OTU2N30.shEHG6e9nTCHzB93eAKH8LaTYnzCQtfeAzYFv7qzd9A
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaGdicXZ6d2NwY25jYXF2Znl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAxMzU2NywiZXhwIjoyMDc1NTg5NTY3fQ.xOVkEtYD9HRsPpDF_XkrbCkQM5-XN4Fk3WOUWxLcViE
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL =
http://localhost:3000/dashboard"OPENAI_API_KEY=your_openai_api_key_here"
```

#### ✅ **Add These (NeonDB + NextAuth + Cloudinary):**
```env
# Database (Required)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require

# NextAuth (Required)
NEXTAUTH_SECRET=your-secret-key  # Generate: openssl rand -base64 32
NEXTAUTH_URL=https://your-domain.com  # Your production URL

# Cloudinary (Required for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

### 2. **Platform-Specific Instructions**

#### **Vercel**
1. Go to your project: https://vercel.com/dashboard
2. Navigate to: **Settings → Environment Variables**
3. Delete old Supabase variables
4. Add new variables listed above
5. Redeploy your project

#### **Netlify**
1. Go to: **Site Settings → Environment Variables**
2. Remove Supabase variables
3. Add new NeonDB, NextAuth, and Cloudinary variables
4. Trigger a new deploy

#### **Railway/Render**
1. Navigate to your project's environment variables
2. Update with the new configuration
3. Redeploy

---

### 3. **Get Your Credentials**

#### **NeonDB** (Database)
1. Visit: https://console.neon.tech
2. Select your project
3. Copy the **Connection String** (with pooling enabled)
4. Use as `DATABASE_URL`

#### **NextAuth Secret**
Generate a secure random secret:
```bash
openssl rand -base64 32
```
Or use: https://generate-secret.vercel.app/32

#### **Cloudinary** (Image Uploads)
1. Visit: https://cloudinary.com/console
2. Get:
   - Cloud Name
   - API Key
   - API Secret

#### **Google OAuth** (Optional)
1. Visit: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

---

### 4. **Test Your Deployment**

After updating environment variables and redeploying:

✅ **Test Authentication:**
- Sign up with a new account
- Login with credentials
- Try Google OAuth (if enabled)

✅ **Test Database Operations:**
- Create a transaction in Finance module
- Add a note
- Upload a fashion item (tests Cloudinary)

✅ **Check for Errors:**
- Monitor deployment logs
- Check browser console for errors

---

## 🔍 Troubleshooting

### "Database connection failed"
- ✅ Check `DATABASE_URL` is correct
- ✅ Ensure NeonDB project is active
- ✅ Verify connection pooling is enabled in the URL
- ✅ Check if your Neon project is sleeping (free tier limitation)

### "NextAuth error: [JWT_SESSION_ERROR]"
- ✅ Verify `NEXTAUTH_SECRET` is set
- ✅ Check `NEXTAUTH_URL` matches your production domain
- ✅ Ensure it starts with `https://` (not `http://` in production)

### "Image upload failed"
- ✅ Verify all 3 Cloudinary variables are set
- ✅ Check your Cloudinary account is active
- ✅ Ensure API credentials are correct

### "Google Sign-In not working"
- ✅ Add production URL to Google OAuth authorized domains
- ✅ Update redirect URIs in Google Console
- ✅ Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## 📝 Summary of Code Changes

### ✅ Completed
- [x] Removed Supabase SDK from package.json
- [x] Deleted `/lib/supabase/` directory
- [x] Migrated all API routes to NeonDB + Drizzle
- [x] Implemented NextAuth for authentication
- [x] Set up Cloudinary for image storage
- [x] Updated README.md with NeonDB instructions
- [x] Updated .env.example template
- [x] Updated package.json metadata

### 🎯 No Code Changes Needed
Your application code is fully migrated and ready to deploy!

---

## 🚨 Important Notes

1. **Database Schema**: Your database schema is defined in `lib/db/schema.ts` and will be automatically synced when you run `pnpm db:push`

2. **Migrations**: If you make schema changes:
   ```bash
   pnpm db:generate  # Creates migration files
   pnpm db:push      # Applies to database
   ```

3. **Environment Variables**: Never commit `.env.local` to Git. It's already in `.gitignore`

4. **First Deployment**: The first user to sign up will automatically get a personal workspace created

5. **Backup**: Consider setting up NeonDB's backup features in your dashboard

---

## 📞 Need Help?

- **NeonDB Docs**: https://neon.tech/docs/introduction
- **NextAuth Docs**: https://next-auth.js.org/getting-started/introduction
- **Drizzle ORM Docs**: https://orm.drizzle.team/docs/overview
- **Cloudinary Docs**: https://cloudinary.com/documentation

---

## ✨ You're All Set!

Once you update the environment variables on your deployment platform, your app will be fully operational with NeonDB!
