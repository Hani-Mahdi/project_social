# Deploy YouTube OAuth Edge Function

## 🚨 Why You're Getting the Error

The error "Failed to send a request to the Edge Function" happens because the `youtube-oauth-callback` edge function hasn't been deployed to Supabase yet.

---

## 📦 Option 1: Deploy via Supabase Dashboard (EASIEST)

### Step 1: Go to Edge Functions
1. Open https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** in the left sidebar
4. Click **Deploy a new function**

### Step 2: Create the Function
1. Function name: `youtube-oauth-callback`
2. Click **Create function**

### Step 3: Copy the Code
Open the file: `supabase/functions/youtube-oauth-callback/index.ts`

Copy ALL the code and paste it into the Supabase editor.

### Step 4: Set Environment Variables
Before deploying, you need to set secrets:

1. In the Edge Function page, click **Secrets** or **Settings**
2. Add these secrets:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `YOUTUBE_CLIENT_ID` | Your YouTube OAuth Client ID | Google Cloud Console → Credentials |
| `YOUTUBE_CLIENT_SECRET` | Your YouTube OAuth Client Secret | Google Cloud Console → Credentials |
| `ALLOWED_ORIGINS` | `http://localhost:8080,http://localhost:5173` | For development |

**To get YouTube credentials:**
1. Go to https://console.cloud.google.com/
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (or create one)
5. Copy the **Client ID** and **Client Secret**

### Step 5: Deploy
1. Click **Deploy** in the Supabase dashboard
2. Wait for deployment to complete (usually 30-60 seconds)

### Step 6: Test
1. Go back to your app
2. Try connecting YouTube again
3. Should work now!

---

## 📦 Option 2: Deploy via Supabase CLI (ADVANCED)

If you want to use the CLI:

### 1. Install Supabase CLI

**Windows (PowerShell as Admin):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Or download from:**
https://github.com/supabase/cli/releases

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Your Project
```bash
cd c:/Users/Owner/Documents/projectsocial/project_social/growth-copilot
supabase link --project-ref your-project-ref
```

**To find your project ref:**
- Go to Supabase Dashboard → Project Settings → General
- Copy the "Reference ID"

### 4. Set Secrets
```bash
supabase secrets set YOUTUBE_CLIENT_ID=your_client_id_here
supabase secrets set YOUTUBE_CLIENT_SECRET=your_client_secret_here
supabase secrets set ALLOWED_ORIGINS="http://localhost:8080,http://localhost:5173"
```

### 5. Deploy Functions
```bash
supabase functions deploy youtube-oauth-callback
supabase functions deploy upload-to-youtube
```

---

## 🔧 Troubleshooting

### Error: "Function not found"
- Make sure you deployed the function
- Check function name is exactly `youtube-oauth-callback`
- Wait a few minutes after deployment

### Error: "Missing credentials"
- Set `YOUTUBE_CLIENT_SECRET` in Supabase secrets
- Verify the secret name is exactly correct

### Error: "Invalid redirect_uri"
- Go to Google Cloud Console
- Edit your OAuth Client
- Add authorized redirect URIs:
  - `http://localhost:8080/auth/youtube/callback`
  - `http://localhost:5173/auth/youtube/callback`
  - `https://yourdomain.com/auth/youtube/callback`

### CORS Errors
- The edge function now validates origins
- Make sure `ALLOWED_ORIGINS` includes your domain
- For development: `http://localhost:8080,http://localhost:5173`
- For production: add your production URL

---

## ✅ Verify Deployment

After deploying, verify the function works:

1. Go to Supabase Dashboard → Edge Functions
2. Click on `youtube-oauth-callback`
3. You should see:
   - Status: **Deployed**
   - Last deployed: Recent timestamp
   - Secrets: Should show `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CLIENT_ID`, `ALLOWED_ORIGINS`

---

## 🎯 Quick Start (Fastest Method)

**If you just want it working NOW:**

1. **Deploy manually via dashboard** (Option 1 above)
2. **Only set these 2 secrets** (minimum required):
   - `YOUTUBE_CLIENT_SECRET` = Get from Google Cloud Console
   - `YOUTUBE_CLIENT_ID` = Copy from your .env file
3. **Test** by clicking "Connect YouTube" in your app

The `ALLOWED_ORIGINS` can be set later for production.

---

## 📝 After Deployment Checklist

- [ ] Function deployed successfully
- [ ] Secrets configured
- [ ] Google OAuth redirect URIs updated
- [ ] Test YouTube connection in app
- [ ] Check Supabase logs if errors occur

---

**Still having issues?**

Check the Supabase function logs:
1. Dashboard → Edge Functions → youtube-oauth-callback → Logs
2. Look for error messages
3. Common issues: missing secrets, wrong credentials, CORS errors
