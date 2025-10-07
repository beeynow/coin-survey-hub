-- Create withdraw_requests table
CREATE TABLE public.withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  country TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  country_code CHAR(3) NOT NULL,
  phone_number TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'Pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdraw_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own withdrawal requests
CREATE POLICY "Users can insert their own withdrawal requests"
ON public.withdraw_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);