-- Allow public read access to community-images bucket
CREATE POLICY "Public read access for community-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

-- Allow authenticated users to upload to community-images bucket
CREATE POLICY "Authenticated users can upload community images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update community images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'community-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete community images
CREATE POLICY "Authenticated users can delete community images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'community-images'
    AND auth.role() = 'authenticated'
  );
