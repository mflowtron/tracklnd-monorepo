
-- Fix the newsletter subscriber insert policy to require an email
DROP POLICY "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe with email" ON public.newsletter_subscribers FOR INSERT WITH CHECK (email IS NOT NULL AND email <> '');
