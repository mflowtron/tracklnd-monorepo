
-- Create storage bucket for meet images
INSERT INTO storage.buckets (id, name, public) VALUES ('meet-images', 'meet-images', true);

-- Allow public read access
CREATE POLICY "Meet images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'meet-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload meet images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meet-images' AND auth.role() = 'authenticated');
