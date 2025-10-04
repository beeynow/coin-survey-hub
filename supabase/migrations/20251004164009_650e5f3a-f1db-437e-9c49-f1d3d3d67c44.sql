-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  coin_balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create surveys table
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  coin_reward INTEGER DEFAULT 10 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Surveys policies (public read)
CREATE POLICY "Anyone can view active surveys"
  ON public.surveys FOR SELECT
  USING (is_active = true);

-- Create survey responses table
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(survey_id, user_id)
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Survey responses policies
CREATE POLICY "Users can view their own responses"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create coin transactions table
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- Coin transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger to update profile coin balance
CREATE OR REPLACE FUNCTION update_coin_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET coin_balance = coin_balance + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_coin_transaction_created
  AFTER INSERT ON public.coin_transactions
  FOR EACH ROW EXECUTE FUNCTION update_coin_balance();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to award coins on survey completion
CREATE OR REPLACE FUNCTION award_survey_coins()
RETURNS TRIGGER AS $$
DECLARE
  reward_amount INTEGER;
BEGIN
  -- Get the coin reward for this survey
  SELECT coin_reward INTO reward_amount
  FROM public.surveys
  WHERE id = NEW.survey_id;
  
  -- Create a coin transaction
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, survey_id)
  VALUES (NEW.user_id, reward_amount, 'survey_completion', NEW.survey_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_survey_completed
  AFTER INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION award_survey_coins();

-- Insert some sample surveys
INSERT INTO public.surveys (title, description, questions, coin_reward) VALUES
(
  'Customer Satisfaction Survey',
  'Help us improve our services by sharing your feedback',
  '[
    {"id": "q1", "type": "rating", "question": "How satisfied are you with our service?", "scale": 5},
    {"id": "q2", "type": "text", "question": "What could we improve?"},
    {"id": "q3", "type": "multiple", "question": "How often do you use our service?", "options": ["Daily", "Weekly", "Monthly", "Rarely"]}
  ]'::jsonb,
  25
),
(
  'Product Feedback',
  'Share your thoughts on our latest product',
  '[
    {"id": "q1", "type": "rating", "question": "Rate the product quality", "scale": 5},
    {"id": "q2", "type": "multiple", "question": "Would you recommend this to a friend?", "options": ["Yes", "No", "Maybe"]},
    {"id": "q3", "type": "text", "question": "Any suggestions for improvement?"}
  ]'::jsonb,
  30
),
(
  'Quick Poll',
  'Quick 2-minute poll about your preferences',
  '[
    {"id": "q1", "type": "multiple", "question": "What is your age group?", "options": ["18-25", "26-35", "36-45", "46-55", "55+"]},
    {"id": "q2", "type": "multiple", "question": "What is your primary interest?", "options": ["Technology", "Fashion", "Food", "Travel", "Sports"]}
  ]'::jsonb,
  15
);