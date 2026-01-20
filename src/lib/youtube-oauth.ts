// YouTube OAuth utilities
import { supabase } from './supabase';

const YOUTUBE_CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID || '';
const YOUTUBE_REDIRECT_URI = `${window.location.origin}/auth/youtube/callback`;

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: string;
  refresh_token: string;
  access_token?: string;
  token_expires_at?: string;
  platform_user_id?: string;
  platform_username?: string;
  platform_avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Start YouTube OAuth flow - redirects to Google
 */
export function startYouTubeOAuth(): void {
  if (!YOUTUBE_CLIENT_ID) {
    alert('YouTube Client ID not configured. Please add VITE_YOUTUBE_CLIENT_ID to your .env file.');
    return;
  }

  const params = new URLSearchParams({
    client_id: YOUTUBE_CLIENT_ID,
    redirect_uri: YOUTUBE_REDIRECT_URI,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: crypto.randomUUID() // CSRF protection
  });

  // Store state in sessionStorage for verification
  sessionStorage.setItem('youtube_oauth_state', params.get('state')!);

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Handle OAuth callback - exchange code for tokens
 */
export async function handleYouTubeCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
  // Verify state
  const storedState = sessionStorage.getItem('youtube_oauth_state');
  if (state !== storedState) {
    return { success: false, error: 'Invalid state parameter' };
  }
  sessionStorage.removeItem('youtube_oauth_state');

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Exchange code for tokens via edge function (keeps client secret secure)
    const { data, error } = await supabase.functions.invoke('youtube-oauth-callback', {
      body: { code, redirect_uri: YOUTUBE_REDIRECT_URI }
    });

    if (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message || 'OAuth callback failed' };
    }

    if (!data) {
      return { success: false, error: 'No data returned from OAuth callback' };
    }

    // Validate required fields
    if (!data.access_token || !data.refresh_token) {
      return { success: false, error: 'Missing required OAuth tokens' };
    }

    // Store tokens in connected_accounts (without scopes field if it doesn't exist)
    const { error: insertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        platform: 'youtube',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour
        platform_user_id: data.channel_id || null,
        platform_username: data.channel_title || null,
        platform_avatar_url: data.channel_avatar || null
      }, {
        onConflict: 'user_id,platform'
      });

    if (insertError) {
      console.error('Failed to save tokens:', insertError);
      return { success: false, error: 'Failed to save connection' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('OAuth error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Get user's connected YouTube account
 */
export async function getYouTubeConnection(): Promise<ConnectedAccount | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Disconnect YouTube account
 */
export async function disconnectYouTube(): Promise<boolean> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'youtube');

  return !error;
}

/**
 * Check if YouTube is connected
 */
export async function isYouTubeConnected(): Promise<boolean> {
  const connection = await getYouTubeConnection();
  return !!connection;
}
