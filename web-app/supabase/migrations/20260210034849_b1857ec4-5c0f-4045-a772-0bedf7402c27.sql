
-- Create storage bucket for work cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('work-images', 'work-images', true);

-- Allow public read access
CREATE POLICY "Work images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload work images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'work-images' AND auth.role() = 'authenticated');
