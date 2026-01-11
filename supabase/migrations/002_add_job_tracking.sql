-- Add job tracking columns for parallel file processing
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reports_file_id ON reports(file_id);
CREATE INDEX IF NOT EXISTS idx_reports_processing_status ON reports(processing_status);

-- Update status check constraint to include new statuses
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'edited', 'error'));
