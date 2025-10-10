-- Create table for chat messages with user memory
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for lesson progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_day INTEGER NOT NULL CHECK (lesson_day BETWEEN 1 AND 20),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, lesson_day)
);

-- Create table for user preferences (to track if user has seen welcomes)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  has_seen_welcome BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view their own progress"
  ON public.lesson_progress FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own progress"
  ON public.lesson_progress FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);