-- Connected Accounts table for storing OAuth tokens per user
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter')),
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT,
  platform_username TEXT,
  platform_avatar_url TEXT,
  scopes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One account per platform per user
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connected accounts
CREATE POLICY "Users can view own connected accounts"
  ON connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connected accounts"
  ON connected_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connected accounts"
  ON connected_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connected accounts"
  ON connected_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS connected_accounts_user_platform_idx 
  ON connected_accounts(user_id, platform);
