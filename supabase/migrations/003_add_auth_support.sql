-- Migration: Add authentication support
-- This adds user_id to reports and updates RLS policies

-- Add user_id column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Reports are publicly readable" ON reports;
DROP POLICY IF EXISTS "Anyone can insert reports" ON reports;
DROP POLICY IF EXISTS "Anyone can update reports" ON reports;

-- New RLS policies for authenticated users

-- Users can view their own reports OR reports without user_id (legacy/anonymous)
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated users can insert reports with their user_id
CREATE POLICY "Authenticated users can insert reports" ON reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (user_id = auth.uid() OR user_id IS NULL)
  );

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
