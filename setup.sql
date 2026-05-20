-- 1. Create Tables

-- Presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  theme JSONB DEFAULT '{"themeColor": "#8b5cf6", "accentColor": "#ffffff"}'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  pptx_url TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  raw_pdf_text TEXT,
  ai_raw_response TEXT,
  failed_at_step TEXT,
  error_logs TEXT,
  last_successful_step TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- History Uploads table
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  ppt_url TEXT,
  exam_name TEXT,
  extracted_json JSONB DEFAULT '[]'::jsonb,
  total_questions INTEGER DEFAULT 0,
  raw_pdf_text TEXT,
  ai_raw_response TEXT,
  pipeline_status TEXT,
  failed_at_step TEXT,
  error_logs TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Setup Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdfs', 'pdfs', true), ('pptxs', 'pptxs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Authenticated Users Only)

-- Presentations
CREATE POLICY "Users can read own presentations" ON public.presentations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own presentations" ON public.presentations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presentations" ON public.presentations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own presentations" ON public.presentations FOR DELETE USING (auth.uid() = user_id);

-- Uploads/History
CREATE POLICY "Users can read own uploads" ON public.uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uploads" ON public.uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON public.uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON public.uploads FOR DELETE USING (auth.uid() = user_id);

-- 5. Storage Policies

-- Storage Objects
CREATE POLICY "Users can upload pdfs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can upload pptxs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pptxs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can read pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'pdfs' AND auth.uid() = owner);
CREATE POLICY "Users can read pptxs" ON storage.objects FOR SELECT USING (bucket_id = 'pptxs' AND auth.uid() = owner);

CREATE POLICY "Users can update own pdfs" ON storage.objects FOR UPDATE USING (bucket_id = 'pdfs' AND auth.uid() = owner);
CREATE POLICY "Users can update own pptxs" ON storage.objects FOR UPDATE USING (bucket_id = 'pptxs' AND auth.uid() = owner);

CREATE POLICY "Users can delete own pdfs" ON storage.objects FOR DELETE USING (bucket_id = 'pdfs' AND auth.uid() = owner);
CREATE POLICY "Users can delete own pptxs" ON storage.objects FOR DELETE USING (bucket_id = 'pptxs' AND auth.uid() = owner);

-- 6. Access Control Table
CREATE TABLE IF NOT EXISTS public.allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: RLS allows any authenticated user to check their own email, or admins only depending on your specific needs.
-- Here we'll just allow authenticated users to read the table.
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read allowed_users" ON public.allowed_users FOR SELECT USING (auth.uid() IS NOT NULL);
-- Only service role or super admin should be able to insert/update this directly via dashboard
