# NextAuth Setup Guide

## ✅ Current Status

Your NextAuth setup is **already complete**! The database schema, configuration, and dependencies are all properly set up.

## 🔧 Required Environment Variables

Create a `.env` file in the frontend directory with these variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/calendar_assistant"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Backend API (optional)
BACKEND_URL="http://localhost:8000"
```

## 🔑 Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable Google+ API** and **Google Calendar API**
4. **Go to Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. **Configure OAuth consent screen**:
   - Add your domain to authorized domains
   - Add scopes: `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events`
6. **Create OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`

## 🗄️ Database Setup

1. **Set up PostgreSQL database**
2. **Run Prisma migrations**:
   ```bash
   cd apps/frontend
   pnpm db:push
   # or
   pnpm db:migrate
   ```

## 🚀 Testing Authentication

1. **Start the development server**:

   ```bash
   cd apps/frontend
   pnpm dev
   ```

2. **Test authentication**:
   - Visit: `http://localhost:3000/auth-test` (dedicated test page)
   - Or visit: `http://localhost:3000/chat` (main app with auth)
   - Or visit: `http://localhost:3000/api/auth/signin` (NextAuth signin page)

3. **Click "Sign in with Google"** to test the OAuth flow

## ✅ What's Been Enabled

- ✅ **SessionProvider** in layout.tsx
- ✅ **Real authentication** in chat page (removed demo data)
- ✅ **tRPC authentication** context enabled
- ✅ **Google Calendar API** route enabled
- ✅ **Authentication test page** created at `/auth-test`

## 📋 What's Already Configured

- ✅ **Database Schema**: All NextAuth tables (User, Account, Session, VerificationToken)
- ✅ **NextAuth Config**: Google provider with Calendar scopes
- ✅ **Dependencies**: All required packages installed
- ✅ **API Routes**: NextAuth API routes set up
- ✅ **TypeScript**: Proper type definitions

## 🔄 Integration with Backend

The frontend will handle all authentication and database operations. The stateless backend will receive user context through API calls from the frontend.

## 🎯 Next Steps

1. Set up environment variables
2. Configure Google OAuth credentials
3. Run database migrations
4. Test the authentication flow
5. Integrate with your calendar features
