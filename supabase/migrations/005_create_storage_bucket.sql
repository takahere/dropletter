-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for uploads bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow service role to upload (for API)
CREATE POLICY "Allow service role uploads"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'uploads');

-- Allow service role to read (for processing)
CREATE POLICY "Allow service role downloads"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'uploads');

-- Allow service role to delete (for cleanup)
CREATE POLICY "Allow service role deletes"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'uploads');

-- Allow anon uploads (for unauthenticated users)
CREATE POLICY "Allow anon uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'uploads');
