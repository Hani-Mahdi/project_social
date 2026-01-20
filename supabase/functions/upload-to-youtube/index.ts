import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { post_id } = await req.json()

    if (!post_id) {
      throw new Error('post_id is required')
    }

    // Get the post data
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .single()

    if (postError || !post) {
      throw new Error('Post not found')
    }

    // Get the video file from storage
    const { data: fileData, error: fileError } = await supabaseClient
      .storage
      .from(post.bucket || 'FreeBucket')
      .download(post.path)

    if (fileError || !fileData) {
      throw new Error('Failed to download video file')
    }

    // Get YouTube credentials from environment
    const clientId = Deno.env.get('YOUTUBE_CLIENT_ID')
    const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET')
    const refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN')

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('YouTube credentials not configured. Please set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN in Supabase secrets.')
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get YouTube access token')
    }

    // Upload to YouTube using resumable upload
    // Step 1: Initialize upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
          'X-Upload-Content-Length': fileData.size.toString(),
        },
        body: JSON.stringify({
          snippet: {
            title: post.title || 'Untitled Video',
            description: post.description || '',
            categoryId: '22', // People & Blogs
          },
          status: {
            privacyStatus: post.privacy || 'private',
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    )

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      throw new Error(`YouTube upload init failed: ${errorText}`)
    }

    const uploadUrl = initResponse.headers.get('Location')
    if (!uploadUrl) {
      throw new Error('Failed to get upload URL from YouTube')
    }

    // Step 2: Upload the video
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'video/*',
      },
      body: fileData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`YouTube upload failed: ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()

    // Update post with YouTube video ID
    await supabaseClient
      .from('posts')
      .update({
        youtube_id: uploadResult.id,
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', post_id)

    return new Response(
      JSON.stringify({
        success: true,
        youtube_id: uploadResult.id,
        message: 'Video uploaded to YouTube successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('YouTube upload error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
