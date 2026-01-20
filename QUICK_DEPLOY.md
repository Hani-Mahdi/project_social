# ⚡ Quick Deploy - YouTube OAuth Function

## ✅ You Have: Secrets configured
## ❌ You Need: Edge function deployed

---

## 🚀 Deploy via Supabase Dashboard (2 minutes)

### Step 1: Open Edge Functions
1. Go to: https://supabase.com/dashboard/project/wkokdmfjuctvlhefxhrk/functions
2. Or navigate: Dashboard → Your Project → Edge Functions

### Step 2: Create Function
1. Click **"Deploy a new function"** or **"New Function"**
2. Function name: **youtube-oauth-callback**
3. Don't click "Create" yet!

### Step 3: Copy This Code
Open your file: `supabase/functions/youtube-oauth-callback/index.ts`

**Or copy from here:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Get allowed origins from environment or default to localhost for development
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'http://localhost:8080',
  'http://localhost:5173',
  'https://your-production-domain.com'
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed =>
    origin === allowed || origin.endsWith(allowed.replace(/^https?:\/\//, ''))
  )

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()

    if (!code) {
      throw new Error('Authorization code is required')
    }

    const clientId = Deno.env.get('YOUTUBE_CLIENT_ID')
    const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('YouTube credentials not configured')
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    // Get channel info using the access token
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      }
    )

    const channelData = await channelResponse.json()
    const channel = channelData.items?.[0]

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        channel_avatar: channel?.snippet?.thumbnails?.default?.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('YouTube OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

### Step 4: Paste and Deploy
1. Paste the code into the function editor
2. Click **"Deploy function"** or **"Save & Deploy"**
3. Wait 30-60 seconds for deployment

### Step 5: Verify Deployment
After deployment completes, you should see:
- ✅ Status: **Deployed** (green)
- ✅ Function URL visible
- ✅ Secrets attached (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET)

---

## 🧪 Test It

1. Go back to your app
2. Navigate to Settings
3. Click **"Connect YouTube"**
4. Authorize with Google
5. Should now work! ✅

---

## 🔍 If It Still Fails

### Check Function Logs:
1. Dashboard → Edge Functions → youtube-oauth-callback → **Logs**
2. Look for errors

### Common Issues:

**"Function not found"**
- Wait 1-2 minutes after deployment
- Hard refresh your app (Ctrl + Shift + R)
- Function name must be exactly: `youtube-oauth-callback`

**"Credentials not configured"**
- Verify secrets exist:
  - `YOUTUBE_CLIENT_ID`
  - `YOUTUBE_CLIENT_SECRET`
- Secret values must not have extra spaces

**"Invalid redirect_uri"**
- Go to Google Cloud Console
- OAuth Client → Authorized redirect URIs
- Add: `http://localhost:8080/auth/youtube/callback`

---

## 📱 Alternative: Deploy via REST API

If the dashboard doesn't work, you can deploy via curl:

```bash
# Get your service role key from Dashboard → Settings → API
curl -X POST 'https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/youtube-oauth-callback' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @supabase/functions/youtube-oauth-callback/index.ts
```

---

**That's it! Once deployed, the YouTube OAuth should work perfectly.** ✅
