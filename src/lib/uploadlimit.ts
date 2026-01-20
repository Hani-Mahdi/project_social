// uploadLimit.ts
// Streamlined: Videos stored in bucket, metadata in videos table only
import { supabase } from './supabase';

// Constants
const MAX_VIDEOS = 3;
const BUCKET_NAME = 'FreeBucket';

// Types
export interface Video {
  id: string;
  user_id: string;
  title: string | null;
  storage_path: string;
  public_url: string;
  caption: string | null;
  status: 'draft' | 'scheduled' | 'posted';
  created_at: string;
}

export interface VideoStats {
  videos: Video[];
  totalVideos: number;
  remainingSlots: number;
  canUpload: boolean;
}

export interface UploadResult {
  path: string;
  url: string;
  videoId: string;  // ID of the created video record
}

/**
 * Get the current user's video statistics based on videos table
 * @returns VideoStats object with user's video information
 * @throws Error if not authenticated or query fails
 */
export async function getFreeBucketStats(): Promise<VideoStats> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // Count videos from the videos table (actual saved drafts/posts)
  const { data, count, error } = await supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const totalVideos = count ?? 0;

  return {
    videos: (data as Video[]) ?? [],
    totalVideos,
    remainingSlots: Math.max(0, MAX_VIDEOS - totalVideos),
    canUpload: totalVideos < MAX_VIDEOS
  };
}

/**
 * Upload a video to FreeBucket with 3-video limit enforcement
 * @param file - The video file to upload
 * @returns UploadResult with path information
 * @throws Error if limit reached, not authenticated, or upload fails
 */
export async function uploadVideoToFreeBucket(file: File): Promise<UploadResult> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // 1. Check current video count from videos table (actual drafts/posts)
  const { count, error: countError } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) throw countError;

  if (count !== null && count >= MAX_VIDEOS) {
    throw new Error(`Upload limit reached. Free users can only upload ${MAX_VIDEOS} videos. Please delete existing videos to upload new ones.`);
  }

  // 2. Upload to FreeBucket
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${user.id}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError || !uploadData) {
    throw uploadError || new Error('Upload failed');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uploadData.path);

  // 3. Auto-create video record in database
  // Note: Database trigger will also enforce the limit server-side (see enforce_upload_limit.sql)
  const { data: videoRecord, error: videoError } = await supabase
    .from('videos')
    .insert({
      user_id: user.id,
      title: file.name.replace(/\.[^/.]+$/, ''), // Use filename without extension as title
      storage_path: uploadData.path,
      public_url: urlData.publicUrl,
      status: 'draft'
    })
    .select()
    .single();

  if (videoError) {
    // Rollback: delete the uploaded file if database insert fails
    try {
      await supabase.storage.from(BUCKET_NAME).remove([uploadData.path]);
    } catch (cleanupError) {
      console.error('Failed to cleanup uploaded file:', cleanupError);
    }

    // Check if error is due to upload limit trigger
    if (videoError.message?.includes('Upload limit reached')) {
      throw new Error(`Upload limit reached. Free users can only upload ${MAX_VIDEOS} videos. Please delete existing videos to upload new ones.`);
    }

    throw videoError;
  }

  return {
    path: uploadData.path,
    url: urlData.publicUrl,
    videoId: videoRecord.id
  };
}

/**
 * Delete a video from FreeBucket and remove from videos table
 * @param videoId - The ID of the video to delete
 * @returns true if successful
 * @throws Error if not authenticated or delete fails
 */
export async function deleteVideoFromFreeBucket(videoId: string): Promise<boolean> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // 1. Get video record to find storage path
  const { data: video, error: fetchError } = await supabase
    .from('videos')
    .select('storage_path')
    .eq('id', videoId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Delete from storage if path exists
  if (video?.storage_path) {
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([video.storage_path]);
  }

  // 3. Delete from videos table
  const { error: dbError } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('user_id', user.id);

  if (dbError) throw dbError;

  return true;
}

/**
 * Get a public URL for a video in FreeBucket
 * @param videoPath - The path of the video
 * @returns Public URL string
 */
export function getVideoPublicUrl(videoPath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(videoPath);
  
  return data.publicUrl;
}

/**
 * Check if user can upload more videos
 * @returns boolean indicating if user has remaining upload slots
 * @throws Error if not authenticated or query fails
 */
export async function canUserUpload(): Promise<boolean> {
  const stats = await getFreeBucketStats();
  return stats.canUpload;
}

// Export constants for use in frontend
export const VIDEO_UPLOAD_CONSTANTS = {
  MAX_VIDEOS,
  BUCKET_NAME
} as const;