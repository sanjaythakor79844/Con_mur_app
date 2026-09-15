CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'patient');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  doctor_name TEXT,
  symptoms_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  awis_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  condition_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  consultation_summary TEXT,
  lifestyle_management JSONB NOT NULL DEFAULT '[]'::jsonb,
  medication JSONB NOT NULL DEFAULT '[]'::jsonb,
  nutrition JSONB NOT NULL DEFAULT '[]'::jsonb,
  physical_activity JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_up JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_draft JSONB,
  doctor_edited_version JSONB,
  approved_version JSONB,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient reads approved prescriptions" ON public.prescriptions
FOR SELECT TO authenticated
USING (auth.uid() = patient_id AND status = 'APPROVED');

CREATE POLICY "doctor reads own prescriptions" ON public.prescriptions
FOR SELECT TO authenticated
USING (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctor creates prescriptions" ON public.prescriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctor updates own prescriptions" ON public.prescriptions
FOR UPDATE TO authenticated
USING (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'doctor'))
WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctor deletes own drafts" ON public.prescriptions
FOR DELETE TO authenticated
USING (auth.uid() = doctor_id AND status <> 'APPROVED' AND public.has_role(auth.uid(), 'doctor'));

CREATE INDEX prescriptions_patient_idx ON public.prescriptions (patient_id, created_at DESC);
CREATE INDEX prescriptions_doctor_idx ON public.prescriptions (doctor_id, created_at DESC);

CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "doctors read patient profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctors read assessments" ON public.assessments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctors read reports" ON public.reports
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctors read appointments" ON public.appointments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctors notify patients" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'doctor'));