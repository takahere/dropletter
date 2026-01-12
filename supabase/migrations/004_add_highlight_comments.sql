-- Migration: Add highlight comments table
-- Users can add comments to specific highlights in reports

-- Create comments table
CREATE TABLE IF NOT EXISTS highlight_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Highlight identification (e.g., "ng-word-0", "pii-phone-1")
  highlight_id TEXT NOT NULL,

  -- Comment content
  content TEXT NOT NULL,

  -- Resolution status
  is_resolved BOOLEAN DEFAULT FALSE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_highlight_comments_report_id ON highlight_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_highlight_comments_user_id ON highlight_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_highlight_comments_highlight_id ON highlight_comments(highlight_id);

-- Enable RLS
ALTER TABLE highlight_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view comments on reports they can access
CREATE POLICY "Anyone can view comments" ON highlight_comments
  FOR SELECT USING (true);

-- Only authenticated users can insert their own comments
CREATE POLICY "Users can insert own comments" ON highlight_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own comments
CREATE POLICY "Users can update own comments" ON highlight_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own comments
CREATE POLICY "Users can delete own comments" ON highlight_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at (reuse existing function if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at'
  ) THEN
    CREATE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END
$$;

CREATE TRIGGER highlight_comments_updated_at
  BEFORE UPDATE ON highlight_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
