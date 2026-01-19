-- =============================================
-- SUPABASE SCHEMA FOR SOCIAL MEDIA MANAGER
-- =============================================

-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. VIDEOS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  caption TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS videos_user_id_idx ON videos(user_id);
CREATE INDEX IF NOT EXISTS videos_status_idx ON videos(status);

-- 3. POSTS TABLE (platform-specific posts per video)
-- =============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter')),
  platform_post_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One platform post per video
  UNIQUE(video_id, platform)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS posts_video_id_idx ON posts(video_id);
CREATE INDEX IF NOT EXISTS posts_platform_idx ON posts(platform);

-- 4. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- VIDEOS policies
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  USING (auth.uid() = user_id);

-- POSTS policies (access through video ownership)
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

-- 5. UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
