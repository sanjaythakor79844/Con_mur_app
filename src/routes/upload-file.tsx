import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { apiService } from "@/lib/api-service";
import { getDeviceId } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/upload-file")({
  head: () => ({
    meta: [
      { title: "Upload Medical Report | Aaha Companion" },
      { name: "description", content: "Upload your medical reports and prescriptions" },
    ],
  }),
  component: UploadFilePage,
});

function UploadFilePage() {
  return (
    <Screen>
      <TopBar title="Upload Report" subtitle="Medical Documents" />
      <RequireAuth message="Sign in to upload medical reports.">
        <UploadFileForm />
      </RequireAuth>
    </Screen>
  );
}

const REPORT_TYPES = [
  { value: 'lh_fsh', label: '🧬 LH/FSH Ratio', icon: 'science' },
  { value: 'testosterone', label: '💪 Testosterone', icon: 'fitness_center' },
  { value: 'tsh', label: '🦋 TSH (Thyroid)', icon: 'favorite' },
  { value: 'ferritin', label: '🩸 Ferritin (Iron)', icon: 'water_drop' },
  { value: 'prolactin', label: '🧪 Prolactin', icon: 'science' },
  { value: 'urine', label: '💧 Urine Protein', icon: 'opacity' },
  { value: 'pregnancy_test', label: '🤰 Pregnancy Test', icon: 'child_care' },
  { value: 'general', label: '📄 General Report', icon: 'description' },
];

function UploadFileForm() {
  const { patient } = useAuth();
  const navigate = useNavigate();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState("lh_fsh");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB"
      });
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only PDF, JPG, PNG, and DOC files are allowed"
      });
      return;
    }

    setSelectedFile(file);
    toast.success("File selected", {
      description: `${file.name} (${formatFileSize(file.size)})`
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    setUploading(true);

    try {
      const response = await apiService.uploadReport(
        selectedFile,
        reportType,
        description.trim() || undefined,
        getDeviceId()
      );

      toast.success("Report uploaded successfully!", {
        description: `Upload ID: ${response.upload.upload_id}`,
      });

      console.log("✅ File uploaded:", response.upload);

      // Reset form
      setSelectedFile(null);
      setDescription("");
      setReportType("lh_fsh");

      // Navigate to uploads page after short delay
      setTimeout(() => {
        navigate({ to: "/my-uploads" });
      }, 1500);

    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!patient) {
    return (
      <Section>
        <Card className="text-center">
          <Icon name="error" className="text-[32px] text-destructive" />
          <p className="mt-2 text-sm font-bold">Patient profile not found</p>
          <p className="text-xs text-muted-foreground">
            Please complete your profile first
          </p>
        </Card>
      </Section>
    );
  }

  return (
    <>
      <Section>
        <Card className="bg-accent/30">
          <div className="flex items-center gap-3">
            <Icon name="upload_file" className="text-[24px] text-primary" />
            <div>
              <p className="text-sm font-bold">Upload Medical Documents</p>
              <p className="text-xs text-muted-foreground">
                Patient: {patient.full_name} (ID: {patient.patient_id})
              </p>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Select File">
        <Card>
          <input
            type="file"
            id="file-input"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <label
            htmlFor="file-input"
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition cursor-pointer ${
              selectedFile
                ? "border-primary bg-primary/5"
                : "border-border bg-muted hover:border-primary/50"
            } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {selectedFile ? (
              <>
                <Icon name="check_circle" className="text-[48px] text-primary" />
                <div className="text-center">
                  <p className="text-sm font-bold">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                {!uploading && (
                  <p className="text-xs text-primary font-semibold">
                    Click to change file
                  </p>
                )}
              </>
            ) : (
              <>
                <Icon name="cloud_upload" className="text-[48px] text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-bold">Click to select file</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, JPG, PNG, DOC (Max 10MB)
                  </p>
                </div>
              </>
            )}
          </label>

          {selectedFile && (
            <button
              onClick={() => {
                setSelectedFile(null);
                toast.info("File removed");
              }}
              disabled={uploading}
              className="mt-3 w-full rounded-xl bg-destructive/10 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
            >
              Remove File
            </button>
          )}
        </Card>
      </Section>

      <Section title="Report Type">
        <div className="grid grid-cols-2 gap-3">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setReportType(type.value)}
              disabled={uploading}
              className={`flex items-center gap-2 rounded-2xl border-2 p-3 text-left transition ${
                reportType === type.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Icon name={type.icon} className="text-[20px]" />
              <span className="text-xs font-semibold leading-tight">{type.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Description (Optional)">
        <Card>
          <label className="text-xs font-semibold text-muted-foreground">
            Add details about this report
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Blood test report from January 2024"
            disabled={uploading}
            rows={3}
            className="mt-2 w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {description.length}/500 characters
          </p>
        </Card>
      </Section>

      <Section>
        <div className="sticky bottom-4 space-y-3">
          <Btn
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            icon={uploading ? "progress_activity" : "upload"}
            className={uploading ? "animate-pulse" : ""}
          >
            {uploading ? "Uploading to Kiosk..." : "Upload to Kiosk Database"}
          </Btn>
          <Btn
            variant="outline"
            icon="cancel"
            onClick={() => navigate({ to: "/reports" })}
            disabled={uploading}
          >
            Cancel
          </Btn>
        </div>
      </Section>
    </>
  );
}
