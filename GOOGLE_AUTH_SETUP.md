# Google Authentication Setup (ComsOS)

ComsOS uses Supabase Auth for Google OAuth.

## 1. Configure Google Cloud

1. Open Google Cloud Console and create/select a project.
2. Go to APIs & Services > OAuth consent screen.
3. Choose External user type (or Internal for Workspace-only).
4. Fill app name, support email, and developer contact email.
5. Add scopes:
   - openid
   - email
   - profile
6. Add test users while in testing mode.
7. Go to APIs & Services > Credentials > Create Credentials > OAuth client ID.
8. App type: Web application.
9. Add Authorized redirect URI:
   - https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
10. Save and copy Client ID + Client Secret.

## 2. Configure Supabase

1. Open Supabase Dashboard for your project.
2. Go to Authentication > Providers > Google.
3. Enable Google provider.
4. Paste Google Client ID and Client Secret from step 1.
5. Save.
6. Go to Authentication > URL Configuration.
7. Set Site URL:
   - Local: http://localhost:3000
   - Prod: your frontend domain
8. Add Redirect URLs:
   - http://localhost:3000/auth/callback
   - https://<YOUR_PROD_DOMAIN>/auth/callback

## 3. ComsOS Environment Variables

## backend/.env

Required:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY
- JWT_SECRET

Notes:
- Do not add GOOGLE_CLIENT_SECRET here for this flow.
- Google OAuth secrets stay in Supabase provider settings.

## frontend/.env.local

Required:
- NEXT_PUBLIC_API_URL=http://localhost:8000
- NEXT_PUBLIC_SITE_URL=http://localhost:3000
- NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<YOUR_SUPABASE_PUBLISHABLE_KEY>

Optional:
- NEXT_PUBLIC_GOOGLE_REDIRECT_URL=http://localhost:3000/auth/callback

## 4. Verify

1. Start backend and frontend.
2. Open /auth/login.
3. Click Continue with Google.
4. Complete consent.
5. Confirm redirect to /dashboard and authenticated API calls succeed.
