-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  plan_type text NOT NULL DEFAULT '30D',
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Create unique constraint to allow only one active subscription per user
CREATE UNIQUE INDEX subscriptions_user_active_idx ON public.subscriptions (user_id) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert subscriptions (for webhook)
CREATE POLICY "System can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

-- System can update subscriptions (for expiration)
CREATE POLICY "System can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (true);

-- Create function to check active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND expires_at > now()
  )
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();