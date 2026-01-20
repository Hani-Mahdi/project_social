-- Enforce 3-video upload limit at database level
-- This prevents bypassing the client-side check

-- Create a function to check video count before insert
CREATE OR REPLACE FUNCTION check_video_limit()
RETURNS TRIGGER AS $$
DECLARE
  video_count INTEGER;
  max_videos INTEGER := 3; -- Free tier limit
BEGIN
  -- Count existing videos for this user
  SELECT COUNT(*) INTO video_count
  FROM videos
  WHERE user_id = NEW.user_id;

  -- Check if limit exceeded
  IF video_count >= max_videos THEN
    RAISE EXCEPTION 'Upload limit reached. Free users can only upload % videos.', max_videos;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert on videos table
DROP TRIGGER IF EXISTS enforce_video_limit ON videos;
CREATE TRIGGER enforce_video_limit
  BEFORE INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION check_video_limit();

-- Add comment for documentation
COMMENT ON FUNCTION check_video_limit() IS 'Enforces 3-video upload limit for free tier users at database level';
COMMENT ON TRIGGER enforce_video_limit ON videos IS 'Prevents users from exceeding free tier video upload limit';
