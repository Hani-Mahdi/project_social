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

    const { post_id, privacy } = await req.json()

    if (!post_id) {
      throw new Error('post_id is required')
    }

    // Validate privacy setting (default to private for safety)
    const privacyStatus = ['public', 'private', 'unlisted'].includes(privacy)
      ? privacy
      : 'private'

    // Get the post data with video and user info
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select(`
        *,
        video:videos (
          id,
          user_id,
          title,
          caption,
          storage_path
        )
      `)
      .eq('id', post_id)
      .single()

    if (postError || !post) {
      throw new Error('Post not found')
    }

    if (!post.video) {
      throw new Error('Video data not found')
    }

    const userId = post.video.user_id
    const videoTitle = post.video.title || 'Untitled Video'
    const videoDescription = post.video.caption || ''
    const storagePath = post.video.storage_path

    // Get the user's YouTube connection from connected_accounts
    const { data: youtubeAccount, error: accountError } = await supabaseClient
      .from('connected_accounts')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .single()

    if (accountError || !youtubeAccount) {
      throw new Error('YouTube account not connected for this user')
    }

    if (!youtubeAccount.refresh_token) {
      throw new Error('YouTube refresh token missing')
    }

    // Get YouTube OAuth credentials from environment
    const clientId = Deno.env.get('YOUTUBE_CLIENT_ID')
    const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('YouTube OAuth credentials not configured. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Supabase secrets.')
    }

    // Get the video file from storage
    const { data: fileData, error: fileError } = await supabaseClient
      .storage
      .from('FreeBucket')
      .download(storagePath)

    if (fileError || !fileData) {
      throw new Error('Failed to download video file from storage')
    }

    // Get access token using the user's refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: youtubeAccount.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error('Failed to get YouTube access token')
    }

    // Update the access token in the database (refresh tokens may also be rotated)
    await supabaseClient
      .from('connected_accounts')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()
      })
      .eq('user_id', userId)
      .eq('platform', 'youtube')

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
            title: videoTitle,
            description: videoDescription,
            categoryId: '22', // People & Blogs
          },
          status: {
            privacyStatus: privacyStatus,
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

    // Update post with YouTube video ID and status
    await supabaseClient
      .from('posts')
      .update({
        platform_post_id: uploadResult.id,
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', post_id)

    return new Response(
      JSON.stringify({
        success: true,
        youtube_id: uploadResult.id,
        youtube_url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
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
