import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bar, Btn, Card, Icon, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { listReports, uploadReport } from "@/lib/aaha-api";
import { runReportOcr } from "@/lib/report-ocr.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a lab report | Aaha Companion" },
      { name: "description", content: "Add a lab report by camera, gallery or PDF." },
    ],
  }),
  component: UploadScreen,
});

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

type ReportType = {
  value: string;
  icon: string;
  bg: string;
  fg: string;
  label: string;
  desc: string;
  category: string;
};

const REPORT_TYPES: ReportType[] = [
  { value: "lh_fsh",         icon: "science",        bg: "#ede9fe", fg: "#7c3aed", label: "LH / FSH Ratio",    desc: "Fertility, PCOS",         category: "Lab reports" },
  { value: "testosterone",   icon: "fitness_center",  bg: "#dbeafe", fg: "#2563eb", label: "Testosterone",       desc: "Hormone test",            category: "Lab reports" },
  { value: "tsh",            icon: "favorite",        bg: "#fce7f3", fg: "#db2777", label: "TSH (Thyroid)",      desc: "Thyroid function",        category: "Lab reports" },
  { value: "ferritin",       icon: "water_drop",      bg: "#fee2e2", fg: "#dc2626", label: "Ferritin (Iron)",    desc: "Anaemia, Iron levels",    category: "Lab reports" },
  { value: "prolactin",      icon: "biotech",         bg: "#e0e7ff", fg: "#4338ca", label: "Prolactin",          desc: "Fertility, Hormones",     category: "Lab reports" },
  { value: "urine",          icon: "opacity",         bg: "#cffafe", fg: "#0891b2", label: "Urine Protein",      desc: "Kidney, Pregnancy",       category: "Lab reports" },
  { value: "pregnancy_test", icon: "child_care",      bg: "#ffe4e6", fg: "#e11d48", label: "Pregnancy Test",     desc: "Beta-hCG",                category: "Lab reports" },
  { value: "blood_sugar",    icon: "monitor_heart",   bg: "#ffedd5", fg: "#ea580c", label: "Blood Sugar",        desc: "Diabetes, Glucose",       category: "Lab reports" },
  { value: "cholesterol",    icon: "ecg_heart",       bg: "#fef3c7", fg: "#d97706", label: "Cholesterol",        desc: "Lipid profile",           category: "Lab reports" },
  { value: "hemoglobin",     icon: "bloodtype",       bg: "#fee2e2", fg: "#b91c1c", label: "Hemoglobin (CBC)",   desc: "Complete blood count",    category: "Lab reports" },
  { value: "vitamin_d",      icon: "wb_sunny",        bg: "#fef9c3", fg: "#ca8a04", label: "Vitamin D",          desc: "Bone health, Immunity",   category: "Lab reports" },
  { value: "vitamin_b12",    icon: "electric_bolt",   bg: "#d9f99d", fg: "#65a30d", label: "Vitamin B12",        desc: "Nerve, Energy",           category: "Lab reports" },
  { value: "screening",      icon: "stethoscope",     bg: "#ccfbf1", fg: "#0f766e", label: "Screening Report",   desc: "Kiosk / Health check",    category: "Screening reports" },
  { value: "consultation",   icon: "clinical_notes",  bg: "#e0f2fe", fg: "#0284c7", label: "Consultation Notes", desc: "Doctor visit notes",      category: "Consultation notes" },
  { value: "prescription",   icon: "medication",      bg: "#f3e8ff", fg: "#9333ea", label: "Prescription",       desc: "Medicine prescription",   category: "Consultation notes" },
  { value: "general",        icon: "description",     bg: "#f3f4f6", fg: "#4b5563", label: "General Report",     desc: "Any other report",        category: "Lab reports" },
];

function UploadScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <TopBar title={t("upload.title")} subtitle={t("upload.subtitle")} />
      <RequireAuth message="Sign in so your reports stay linked to your health journey.">
        <UploadForm />
      </RequireAuth>
    </Screen>
  );
}

type Stage = "idle" | "uploading" | "reading" | "done";

function UploadForm() {
  const { userId } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ocr = useServerFn(runReportOcr);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState(REPORT_TYPES[15].value);
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const recent = useQuery({ queryKey: ["reports"], queryFn: listReports });

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error("That file is larger than 10 MB"); return; }
    if (f.type && !ALLOWED.includes(f.type)) { toast.error("Please choose a JPG, PNG or PDF file"); return; }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const selectedType = REPORT_TYPES.find((r) => r.value === reportType)!;

  const upload = useMutation({
    mutationFn: async () => {
      if (!userId || !file) throw new Error("Choose a file first");
      setStage("uploading");
      const report = await uploadReport({
        userId,
        file,
        title: title.trim() || selectedType.label,
        category: selectedType.category,
      });
      setStage("reading");
      try {
        await ocr({ data: { reportId: report.id } });
      } catch (e) {
        toast.warning("Saved, but Aaha could not read the values", {
          description: e instanceof Error ? e.message : "You can enter them manually.",
        });
      }
      setStage("done");
      return report;
    },
    onSuccess: (report) => {
      toast.success("Report saved", { description: "Aaha has added it to your records." });
      setFile(null);
      setTitle("");
      setStage("idle");
      void qc.invalidateQueries({ queryKey: ["reports"] });
      void qc.invalidateQueries({ queryKey: ["test-readings"] });
      void qc.invalidateQueries({ queryKey: ["assessments"] });
      void navigate({ to: "/report/$id", params: { id: report.id } });
    },
    onError: (e) => {
      setStage("idle");
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Please try again." });
    },
  });

  const stageLabel =
    stage === "uploading" ? t("upload.uploading") : stage === "reading" ? t("upload.reading") : "";

  return (
    <>
      {/* Step 1 - Select Report Type */}
      <Section title="Step 1 - Select Report Type">
        <div className="grid grid-cols-2 gap-2">
          {REPORT_TYPES.map((rt) => {
            const selected = reportType === rt.value;
            return (
              <button
                key={rt.value}
                type="button"
                onClick={() => {
                  setReportType(rt.value);
                  if (!title.trim()) setTitle(rt.label);
                }}
                style={selected ? { borderColor: rt.fg, backgroundColor: rt.bg + "80" } : {}}
                className={`flex items-center gap-2 rounded-2xl border-2 p-3 text-left transition-all ${
                  selected ? "border-current" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: rt.bg, color: rt.fg }}
                >
                  <Icon name={rt.icon} className="text-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{rt.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{rt.desc}</span>
                </span>
                {selected && (
                  <span className="shrink-0 text-[15px]" style={{ color: rt.fg } as React.CSSProperties}>
                    <Icon name="check_circle" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected indicator */}
        <div
          className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{ backgroundColor: selectedType.bg + "60" }}
        >
          <span
            className="grid size-7 shrink-0 place-items-center rounded-lg"
            style={{ backgroundColor: selectedType.bg, color: selectedType.fg }}
          >
            <Icon name={selectedType.icon} className="text-[14px]" />
          </span>
          <span className="text-xs font-semibold" style={{ color: selectedType.fg }}>
            Selected: {selectedType.label}
          </span>
        </div>
      </Section>

      {/* Step 2 - Add File */}
      <Section title="Step 2 - Add File">
        <ul className="grid grid-cols-3 gap-3">
          {[
            { i: "photo_camera",   label: t("upload.camera"),  ref: cameraRef,  accept: "image/*",         capture: true  },
            { i: "photo_library",  label: t("upload.gallery"), ref: galleryRef, accept: "image/*",         capture: false },
            { i: "picture_as_pdf", label: t("upload.pdf"),     ref: pdfRef,     accept: "application/pdf", capture: false },
          ].map((o) => (
            <li key={o.label}>
              <button type="button" onClick={() => o.ref.current?.click()} className="w-full">
                <Card className="p-3 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-primary">
                    <Icon name={o.i} />
                  </span>
                  <span className="mt-2 block text-xs font-semibold">{o.label}</span>
                </Card>
              </button>
              <input
                ref={o.ref}
                type="file"
                accept={o.accept}
                {...(o.capture ? { capture: "environment" as const } : {})}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </li>
          ))}
        </ul>

        <div
          role="button"
          tabIndex={0}
          onClick={() => galleryRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") galleryRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          className="mt-3 block w-full cursor-pointer"
        >
          <div className={`grid place-items-center rounded-3xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            file ? "border-primary bg-primary/5" : dragging ? "border-primary bg-accent" : "border-primary/30 bg-soft"
          }`}>
            {file ? (
              <>
                <Icon name="check_circle" className="text-[36px] text-primary" />
                <p className="mt-2 text-sm font-bold">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB - tap to change</p>
              </>
            ) : (
              <>
                <Icon name="cloud_upload" className="text-[36px] text-primary" />
                <p className="mt-2 text-sm font-bold">{dragging ? "Drop your report here" : t("upload.choose")}</p>
                <p className="text-xs text-muted-foreground">{t("upload.hint")}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">PDF, JPG, PNG - up to 10 MB</p>
              </>
            )}
          </div>
        </div>
      </Section>

      {/* Step 3 - Confirm and Upload */}
      {file && (
        <Section title="Step 3 - Confirm and Upload">
          <Card className="space-y-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                <Icon name="description" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div>
              <label htmlFor="report-title" className="text-xs font-semibold text-muted-foreground">
                {t("upload.name")}
              </label>
              <input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedType.label}
                className="mt-1 min-h-11 w-full rounded-2xl bg-muted px-3 text-sm font-semibold outline-none"
              />
            </div>

            <div
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
              style={{ backgroundColor: selectedType.bg + "60" }}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: selectedType.bg, color: selectedType.fg }}
              >
                <Icon name={selectedType.icon} className="text-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{selectedType.label}</p>
                <p className="text-[10px] text-muted-foreground">{selectedType.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="shrink-0 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/20"
              >
                Change
              </button>
            </div>

            {stage !== "idle" && stage !== "done" ? (
              <div>
                <Bar label={stageLabel} value={stage === "uploading" ? 35 : 80} />
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="progress_activity" className="animate-spin text-[16px] text-primary" />
                  {stageLabel}
                </p>
              </div>
            ) : null}
          </Card>
        </Section>
      )}

      <Section>
        {file ? (
          <Btn onClick={() => upload.mutate()} disabled={upload.isPending} icon="cloud_upload">
            {upload.isPending ? stageLabel : t("upload.cta")}
          </Btn>
        ) : (
          <Btn variant="outline" to="/reports" icon="folder_open">
            {t("upload.viewSaved")}
          </Btn>
        )}
      </Section>

      {recent.data && recent.data.length > 0 ? (
        <Section title={t("upload.recent")}>
          <ul className="space-y-3">
            {recent.data.slice(0, 3).map((r) => (
              <Card as="li" key={r.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => void navigate({ to: "/report/$id", params: { id: r.id } })}
                >
                  <p className="truncate text-sm font-bold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.category} - {new Date(r.report_date || r.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </button>
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}