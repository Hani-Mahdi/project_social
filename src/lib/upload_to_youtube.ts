// youtubeUpload.ts
import { supabase } from './supabase';

export interface YouTubeUploadOptions {
  videoId: string;  // ID of the video in videos table
  privacy?: 'private' | 'public' | 'unlisted';
}

export interface YouTubeUploadResult {
  success: boolean;
  post_id: string;
  youtube_id?: string;
  message: string;
  error?: string;
}

/**
 * Upload a video from FreeBucket to YouTube
 * @param options - Video ID and privacy setting
 * @returns YouTubeUploadResult with upload status
 */
export async function uploadToYouTube(
  options: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { videoId, privacy = 'private' } = options;

    // Verify the video exists and belongs to user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      throw new Error('Video not found or access denied');
    }

    console.log('Creating/updating post record for YouTube upload...');

    // Create or update a post record in the database (uses upsert to handle existing records)
    const { data: post, error: postError } = await supabase
      .from('posts')
      .upsert({
        video_id: videoId,
        user_id: user.id,
        platform: 'youtube',
        status: 'draft'
      }, {
        onConflict: 'video_id,platform'
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation/update error:', postError);
      throw postError;
    }
    if (!post) throw new Error('Failed to create/update post record');

    console.log('Post created:', post.id);

    // For now, since Edge Function isn't deployed, we'll mark this as pending
    // and return success - the actual YouTube upload would happen via Edge Function
    // TODO: Deploy edge function and uncomment below
    
    /*
    console.log('Calling YouTube upload edge function...');
    const { data, error } = await supabase.functions.invoke('upload-to-youtube', {
      body: { post_id: post.id, privacy }
    });

    if (error) {
      console.error('Edge function error:', error);
      await supabase.from('posts').delete().eq('id', post.id);
      throw new Error(error.message || 'YouTube upload failed');
    }
    */

    // Update post status to indicate it's queued
    await supabase
      .from('posts')
      .update({ status: 'scheduled' })
      .eq('id', post.id);

    console.log('YouTube upload queued successfully');

    return {
      success: true,
      post_id: post.id,
      message: 'Video queued for YouTube upload. Edge function deployment required for actual upload.'
    };

  } catch (error: any) {
    console.error('YouTube upload error:', error);
    return {
      success: false,
      post_id: '',
      message: 'Upload failed',
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Get all posts (videos) for the current user
 * @returns Array of user's posts
 */
export async function getUserPosts() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Delete a post and optionally remove from YouTube
 * Note: This only deletes the database record, not the YouTube video
 * @param postId - The post ID to delete
 */
export async function deletePost(postId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id);

  if (error) throw error;

  return true;
}

/**
 * Get a single post by ID
 * @param postId - The post ID
 */
export async function getPost(postId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;

  return data;
}