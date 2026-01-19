// youtubeUpload.ts
import { supabase } from './supabase';

export interface YouTubeUploadOptions {
  videoPath: string;
  title: string;
  description?: string;
  privacy?: 'private' | 'public' | 'unlisted';
  bucket?: string;
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
 * @param options - Video metadata and path
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

    const {
      videoPath,
      title,
      description = '',
      privacy = 'private',
      bucket = 'FreeBucket'
    } = options;

    console.log('Creating post record for YouTube upload...');

    // Create a post record in the database
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        description,
        path: videoPath,
        bucket,
        status: 'draft',
        privacy,
        platform: 'youtube' // Added platform field
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      throw postError;
    }
    if (!post) throw new Error('Failed to create post record');

    console.log('Post created:', post.id);
    console.log('Calling YouTube upload edge function...');

    // Call the edge function to upload to YouTube
    const { data, error } = await supabase.functions.invoke('upload-to-youtube', {
      body: { post_id: post.id }
    });

    if (error) {
      console.error('Edge function error:', error);
      // Rollback: delete the post if YouTube upload fails
      await supabase.from('posts').delete().eq('id', post.id);
      throw new Error(error.message || 'YouTube upload failed');
    }

    console.log('YouTube upload successful:', data);

    return {
      success: true,
      post_id: post.id,
      youtube_id: data.youtube_id,
      message: 'Video uploaded to YouTube successfully'
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