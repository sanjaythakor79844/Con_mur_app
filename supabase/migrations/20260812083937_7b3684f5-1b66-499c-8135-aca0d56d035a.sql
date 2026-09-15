
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.care_assignments (
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

DROP POLICY IF EXISTS "doctor reads own assignments" ON public.care_assignments;
CREATE POLICY "doctor reads own assignments" ON public.care_assignments FOR SELECT TO authenticated
USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage assignments" ON public.care_assignments;
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

DROP POLICY IF EXISTS "doctors read patient profiles" ON public.profiles;
CREATE POLICY "doctors read assigned patient profiles" ON public.profiles FOR SELECT TO authenticated
USING (private.treats_patient(id));

DROP POLICY IF EXISTS "doctors read assessments" ON public.assessments;
CREATE POLICY "doctors read assigned assessments" ON public.assessments FOR SELECT TO authenticated
USING (private.treats_patient(user_id));

DROP POLICY IF EXISTS "doctors read reports" ON public.reports;
CREATE POLICY "doctors read assigned reports" ON public.reports FOR SELECT TO authenticated
USING (private.treats_patient(user_id));

DROP POLICY IF EXISTS "doctors read appointments" ON public.appointments;
CREATE POLICY "doctors read assigned appointments" ON public.appointments FOR SELECT TO authenticated
USING (private.treats_patient(user_id));

DROP POLICY IF EXISTS "doctors notify patients" ON public.notifications;
CREATE POLICY "doctors notify patients" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (private.treats_patient(user_id));

DROP POLICY IF EXISTS "doctor creates prescriptions" ON public.prescriptions;
CREATE POLICY "doctor creates prescriptions" ON public.prescriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'));

DROP POLICY IF EXISTS "doctor deletes own drafts" ON public.prescriptions;
CREATE POLICY "doctor deletes own drafts" ON public.prescriptions FOR DELETE TO authenticated
USING (auth.uid() = doctor_id AND status <> 'APPROVED' AND private.has_role(auth.uid(), 'doctor'));

DROP POLICY IF EXISTS "doctor updates own prescriptions" ON public.prescriptions;
CREATE POLICY "doctor updates own prescriptions" ON public.prescriptions FOR UPDATE TO authenticated
USING (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'))
WITH CHECK (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'));

DROP POLICY IF EXISTS "doctor reads own prescriptions" ON public.prescriptions;
CREATE POLICY "doctor reads own prescriptions" ON public.prescriptions FOR SELECT TO authenticated
USING (auth.uid() = doctor_id AND private.has_role(auth.uid(), 'doctor'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

DROP POLICY IF EXISTS "own report files update" ON storage.objects;
CREATE POLICY "own report files update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
