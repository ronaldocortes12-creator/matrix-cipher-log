-- Add language column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN language TEXT DEFAULT 'pt' CHECK (language IN ('pt', 'en', 'es'));