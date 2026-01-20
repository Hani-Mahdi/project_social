import { supabase } from './supabase';

// =============================================
// TYPES
// =============================================

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'twitter';
export type VideoStatus = 'draft' | 'scheduled' | 'posted';
export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'failed';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  title: string | null;
  storage_path: string;
  public_url: string;
  caption: string | null;
  status: VideoStatus;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  video_id: string;
  platform: Platform;
  platform_post_id: string | null;
  status: PostStatus;
  error_message: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoWithPosts extends Video {
  posts: Post[];
}

export interface UserStats {
  totalVideos: number;
  draftVideos: number;
  scheduledVideos: number;
  postedVideos: number;
  platformStats: Record<Platform, number>;
}

// =============================================
// PROFILE FUNCTIONS
// =============================================

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateUserProfile(
  userId: string, 
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// VIDEO FUNCTIONS
// =============================================

export async function getUserVideos(userId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRecentVideos(userId: string, limit: number = 5): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getVideoById(videoId: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getVideoWithPosts(videoId: string): Promise<VideoWithPosts | null> {
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (videoError && videoError.code !== 'PGRST116') throw videoError;
  if (!video) return null;

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .eq('video_id', videoId);

  if (postsError) throw postsError;

  return { ...video, posts: posts || [] };
}

export interface CreateVideoInput {
  user_id: string;
  title?: string;
  storage_path: string;
  public_url: string;
  caption?: string;
  status?: VideoStatus;
  scheduled_at?: string;
}

export async function createVideo(video: CreateVideoInput): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      user_id: video.user_id,
      title: video.title || null,
      storage_path: video.storage_path,
      public_url: video.public_url,
      caption: video.caption || null,
      status: video.status || 'draft',
      scheduled_at: video.scheduled_at || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface UpdateVideoInput {
  title?: string;
  caption?: string;
  status?: VideoStatus;
  scheduled_at?: string | null;
  posted_at?: string | null;
}

export async function updateVideo(videoId: string, updates: UpdateVideoInput): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', videoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVideo(videoId: string): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);

  if (error) throw error;
}

// =============================================
// POST FUNCTIONS
// =============================================

export async function getVideoPosts(videoId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export interface CreatePostInput {
  video_id: string;
  platform: Platform;
  status?: PostStatus;
  scheduled_at?: string;
}

export async function createPost(post: CreatePostInput): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      video_id: post.video_id,
      platform: post.platform,
      status: post.status || 'draft',
      scheduled_at: post.scheduled_at || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createOrUpdatePost(
  videoId: string,
  platform: Platform,
  updates: Partial<Pick<Post, 'status' | 'scheduled_at' | 'posted_at' | 'platform_post_id' | 'error_message'>>
): Promise<Post> {
  // Try insert first (optimistic approach)
  const { data: insertData, error: insertError } = await supabase
    .from('posts')
    .insert({
      video_id: videoId,
      platform: platform,
      ...updates
    })
    .select()
    .single();

  // If insert succeeded, return the new post
  if (!insertError) {
    return insertData;
  }

  // If error is NOT a duplicate key constraint, throw it
  if (!insertError.message?.includes('duplicate key') &&
      !insertError.message?.includes('posts_video_id_platform_key')) {
    throw insertError;
  }

  // It's a duplicate - update instead
  const { data: existingPost } = await supabase
    .from('posts')
    .select('id')
    .eq('video_id', videoId)
    .eq('platform', platform)
    .single();

  if (!existingPost) {
    throw new Error('Failed to find existing post after duplicate key error');
  }

  const { data: updateData, error: updateError } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', existingPost.id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updateData;
}

export async function updatePost(
  postId: string, 
  updates: Partial<Pick<Post, 'status' | 'scheduled_at' | 'posted_at' | 'platform_post_id' | 'error_message'>>
): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}

// =============================================
// STATS & AGGREGATION
// =============================================

export async function getUserStats(userId: string): Promise<UserStats> {
  const videos = await getUserVideos(userId);
  
  // Get all posts for all videos
  const videoIds = videos.map(v => v.id);
  let posts: Post[] = [];
  
  if (videoIds.length > 0) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .in('video_id', videoIds);
    
    if (error) throw error;
    posts = data || [];
  }

  // Calculate platform stats from posts
  const platformStats: Record<Platform, number> = {
    tiktok: 0,
    instagram: 0,
    youtube: 0,
    twitter: 0
  };

  posts.forEach(post => {
    if (post.status === 'posted') {
      platformStats[post.platform]++;
    }
  });

  return {
    totalVideos: videos.length,
    draftVideos: videos.filter(v => v.status === 'draft').length,
    scheduledVideos: videos.filter(v => v.status === 'scheduled').length,
    postedVideos: videos.filter(v => v.status === 'posted').length,
    platformStats
  };
}

// =============================================
// SEARCH & FILTER
// =============================================

export interface SearchVideosOptions {
  userId: string;
  query?: string;
  status?: VideoStatus;
  platform?: Platform;
  limit?: number;
  offset?: number;
}

export async function searchVideos(options: SearchVideosOptions): Promise<Video[]> {
  let query = supabase
    .from('videos')
    .select('*')
    .eq('user_id', options.userId)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.query) {
    query = query.or(`title.ilike.%${options.query}%,caption.ilike.%${options.query}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  // If filtering by platform, we need to check posts
  if (options.platform && data) {
    const videoIds = data.map(v => v.id);
    const { data: posts } = await supabase
      .from('posts')
      .select('video_id')
      .in('video_id', videoIds)
      .eq('platform', options.platform);
    
    const videoIdsWithPlatform = new Set(posts?.map(p => p.video_id) || []);
    return data.filter(v => videoIdsWithPlatform.has(v.id));
  }

  return data || [];
}

// =============================================
// SAVE DRAFT (combines video + posts)
// =============================================

export interface SaveDraftInput {
  videoId: string;
  title?: string;
  caption?: string;
  platforms: Platform[];
  scheduleType: 'now' | 'schedule';
  scheduledAt?: string;
}

export async function saveDraft(input: SaveDraftInput): Promise<VideoWithPosts> {
  // Store original video state for potential rollback
  const originalVideo = await getVideoById(input.videoId);

  try {
    // Update video
    const video = await updateVideo(input.videoId, {
      title: input.title,
      caption: input.caption,
      status: input.scheduleType === 'schedule' ? 'scheduled' : 'draft',
      scheduled_at: input.scheduleType === 'schedule' ? input.scheduledAt : null
    });

    // Create/update posts for each platform with error collection
    const posts: Post[] = [];
    const errors: Error[] = [];

    for (const platform of input.platforms) {
      try {
        const post = await createOrUpdatePost(input.videoId, platform, {
          status: input.scheduleType === 'schedule' ? 'scheduled' : 'draft',
          scheduled_at: input.scheduleType === 'schedule' ? input.scheduledAt : null
        });
        posts.push(post);
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(`Failed to save ${platform} post`));
      }
    }

    // If any platform fails, throw aggregate error
    if (errors.length > 0 && posts.length === 0) {
      throw new Error(`Failed to save posts: ${errors.map(e => e.message).join(', ')}`);
    }

    // Remove posts for platforms not selected
    const allPlatforms: Platform[] = ['tiktok', 'instagram', 'youtube', 'twitter'];
    const platformsToRemove = allPlatforms.filter(p => !input.platforms.includes(p));

    if (platformsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('video_id', input.videoId)
        .in('platform', platformsToRemove);

      if (deleteError) {
        console.error('Failed to remove old platform posts:', deleteError);
        // Don't fail the entire operation if deletion fails
      }
    }

    return { ...video, posts };
  } catch (err) {
    // Attempt to rollback video update if we have original state
    if (originalVideo) {
      try {
        await updateVideo(input.videoId, {
          title: originalVideo.title,
          caption: originalVideo.caption,
          status: originalVideo.status,
          scheduled_at: originalVideo.scheduled_at
        });
      } catch (rollbackErr) {
        console.error('Failed to rollback video update:', rollbackErr);
      }
    }
    throw err;
  }
}
