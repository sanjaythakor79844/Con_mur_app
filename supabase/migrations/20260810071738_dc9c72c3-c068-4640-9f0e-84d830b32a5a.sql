ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS doctor_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS doctor_impression text,
  ADD COLUMN IF NOT EXISTS doctor_instructions text,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'ROUTINE',
  ADD COLUMN IF NOT EXISTS risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.prescription_versions (
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

CREATE INDEX IF NOT EXISTS prescription_versions_prescription_idx
  ON public.prescription_versions (prescription_id, created_at DESC);