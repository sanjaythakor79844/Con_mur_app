CREATE TABLE public.screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  complaint text NOT NULL DEFAULT '',
  language_code text NOT NULL DEFAULT 'en',
  phase text NOT NULL DEFAULT 'intake',
  status text NOT NULL DEFAULT 'in_progress',
  suspected_conditions text[] NOT NULL DEFAULT '{}',
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  awis numeric,
  awis_available boolean NOT NULL DEFAULT false,
  band text,
  summary text,
  report jsonb,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screenings TO authenticated;
GRANT ALL ON public.screenings TO service_role;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own screenings" ON public.screenings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX screenings_user_created_idx ON public.screenings (user_id, created_at DESC);
CREATE TRIGGER screenings_updated_at BEFORE UPDATE ON public.screenings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.screening_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  topic text NOT NULL DEFAULT '',
  question_text text,
  answer text NOT NULL DEFAULT '',
  normalized_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  answered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screening_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_answers TO authenticated;
GRANT ALL ON public.screening_answers TO service_role;
ALTER TABLE public.screening_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own screening answers" ON public.screening_answers FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX screening_answers_screening_idx ON public.screening_answers (screening_id, question_id);
CREATE TRIGGER screening_answers_updated_at BEFORE UPDATE ON public.screening_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.test_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  test_name text NOT NULL DEFAULT '',
  numeric_value numeric,
  text_value text,
  unit text NOT NULL DEFAULT '',
  reference_range text,
  flag text NOT NULL DEFAULT 'green',
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'recorded',
  source text NOT NULL DEFAULT 'manual',
  category text,
  reading_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screening_id, test_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_readings TO authenticated;
GRANT ALL ON public.test_readings TO service_role;
ALTER TABLE public.test_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own test readings" ON public.test_readings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX test_readings_user_idx ON public.test_readings (user_id, reading_at DESC);
CREATE INDEX test_readings_screening_idx ON public.test_readings (screening_id, test_id);
CREATE TRIGGER test_readings_updated_at BEFORE UPDATE ON public.test_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();