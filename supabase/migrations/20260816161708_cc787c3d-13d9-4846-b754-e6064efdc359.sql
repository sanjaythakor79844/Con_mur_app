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
  doctor_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  doctor_impression text,
  doctor_instructions text,
  risk_level text NOT NULL DEFAULT 'ROUTINE',
  risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_acknowledged_at timestamptz,
  revision integer NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX prescriptions_patient_idx ON public.prescriptions (patient_id, created_at DESC);
CREATE INDEX prescriptions_doctor_idx ON public.prescriptions (doctor_id, created_at DESC);

CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.prescription_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.prescription_versions TO authenticated;
GRANT ALL ON public.prescription_versions TO service_role;
ALTER TABLE public.prescription_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor reads own prescription versions"
ON public.prescription_versions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND p.doctor_id = auth.uid()));

CREATE POLICY "doctor writes own prescription versions"
ON public.prescription_versions FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND p.doctor_id = auth.uid())
);

CREATE POLICY "patient reads approved prescription versions"
ON public.prescription_versions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.prescriptions p
  WHERE p.id = prescription_id AND p.patient_id = auth.uid() AND p.status = 'APPROVED'
));

CREATE INDEX prescription_versions_prescription_idx
  ON public.prescription_versions (prescription_id, created_at DESC);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE TABLE public.care_assignments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null,
  patient_id uuid not null,
  assigned_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  unique (doctor_id, patient_id)
);
GRANT SELECT ON public.care_assignments TO authenticated;
GRANT ALL ON public.care_assignments TO service_role;
ALTER TABLE public.care_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor reads own assignments" ON public.care_assignments FOR SELECT TO authenticated
USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage assignments" ON public.care_assignments FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION private.treats_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select private.has_role(auth.uid(), 'doctor') and (
    exists (select 1 from public.prescriptions p where p.doctor_id = auth.uid() and p.patient_id = _patient_id)
    or exists (select 1 from public.care_assignments c where c.doctor_id = auth.uid() and c.patient_id = _patient_id)
  )
$$;
REVOKE ALL ON FUNCTION private.treats_patient(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.treats_patient(uuid) TO authenticated, service_role;

CREATE POLICY "doctors read assigned patient profiles" ON public.profiles FOR SELECT TO authenticated
USING (private.treats_patient(id));

CREATE POLICY "doctors read assigned assessments" ON public.assessments FOR SELECT TO authenticated
USING (private.treats_patient(user_id));

CREATE POLICY "doctors read assigned reports" ON public.reports FOR SELECT TO authenticated
USING (private.treats_patient(user_id));

CREATE POLICY "doctors read assigned appointments" ON public.appointments FOR SELECT TO authenticated
USING (private.treats_patient(user_id));

CREATE POLICY "doctors notify patients" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (private.treats_patient(user_id));

CREATE POLICY "patient reads approved prescriptions" ON public.prescriptions
FOR SELECT TO authenticated
USING (auth.uid() = patient_id AND status = 'APPROVED');

CREATE POLICY "doctor reads own prescriptions" ON public.prescriptions FOR SELECT TO authenticated
USING (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctor creates prescriptions" ON public.prescriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctor updates own prescriptions" ON public.prescriptions FOR UPDATE TO authenticated
USING (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'))
WITH CHECK (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'));

CREATE POLICY "doctor deletes own drafts" ON public.prescriptions FOR DELETE TO authenticated
USING (auth.uid() = doctor_id AND status <> 'APPROVED' AND private.has_role(auth.uid(), 'doctor'));

DROP POLICY IF EXISTS "own report files update" ON storage.objects;
CREATE POLICY "own report files update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);