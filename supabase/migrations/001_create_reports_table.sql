-- Reports table for storing document analysis results
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Document info
  file_name TEXT NOT NULL,
  file_path TEXT,

  -- Processing results (JSON)
  result_json JSONB NOT NULL,

  -- Human edits
  human_edits JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'edited'))
);

-- Index for faster lookups
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (for OG image generation)
CREATE POLICY "Reports are publicly readable" ON reports
  FOR SELECT USING (true);

-- Policy for insert (anyone can create reports)
CREATE POLICY "Anyone can insert reports" ON reports
  FOR INSERT WITH CHECK (true);

-- Policy for update (anyone can update reports)
CREATE POLICY "Anyone can update reports" ON reports
  FOR UPDATE USING (true);
