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
