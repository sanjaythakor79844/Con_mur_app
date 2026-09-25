import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Btn, Card, Icon, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { apiService } from "@/lib/api-service";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/my-uploads")({
  head: () => ({
    meta: [
      { title: "My Uploads | Aaha Companion" },
      { name: "description", content: "View and manage your uploaded medical reports" },
    ],
  }),
  component: MyUploadsPage,
});

function MyUploadsPage() {
  return (
    <Screen>
      <TopBar title="My Uploads" subtitle="Medical Documents" />
      <RequireAuth message="Sign in to view your uploads.">
        <MyUploadsList />
      </RequireAuth>
    </Screen>
  );
}

const REPORT_TYPE_CONFIG = {
  lh_fsh: { emoji: '🧬', label: 'LH/FSH Ratio', color: 'bg-purple-500/10 text-purple-700' },
  testosterone: { emoji: '💪', label: 'Testosterone', color: 'bg-blue-500/10 text-blue-700' },
  tsh: { emoji: '🦋', label: 'TSH (Thyroid)', color: 'bg-teal-500/10 text-teal-700' },
  ferritin: { emoji: '🩸', label: 'Ferritin (Iron)', color: 'bg-red-500/10 text-red-700' },
  prolactin: { emoji: '🧪', label: 'Prolactin', color: 'bg-indigo-500/10 text-indigo-700' },
  urine: { emoji: '💧', label: 'Urine Protein', color: 'bg-cyan-500/10 text-cyan-700' },
  pregnancy_test: { emoji: '🤰', label: 'Pregnancy Test', color: 'bg-pink-500/10 text-pink-700' },
  general: { emoji: '📄', label: 'General Report', color: 'bg-gray-500/10 text-gray-700' },
};

function MyUploadsList() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-uploads"],
    queryFn: () => apiService.getMyUploads(),
    enabled: !!session,
  });

  const handleDelete = async (uploadId: number, filename: string) => {
    if (!confirm(`Delete "${filename}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteUpload(uploadId);
      toast.success("Upload deleted successfully");
      
      // Refresh the list
      queryClient.invalidateQueries({ queryKey: ["my-uploads"] });
    } catch (error) {
      console.error("Failed to delete upload:", error);
      toast.error("Failed to delete upload", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getReportTypeConfig = (type: string) => {
    return REPORT_TYPE_CONFIG[type as keyof typeof REPORT_TYPE_CONFIG] || REPORT_TYPE_CONFIG.general;
  };

  const getStatusConfig = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'valid': return { label: 'Valid', color: 'bg-green-500/10 text-green-700', icon: 'check_circle' };
      case 'pending': return { label: 'Pending', color: 'bg-amber-500/10 text-amber-700', icon: 'schedule' };
      case 'review': return { label: 'In Review', color: 'bg-blue-500/10 text-blue-700', icon: 'visibility' };
      case 'invalid': return { label: 'Invalid', color: 'bg-red-500/10 text-red-700', icon: 'error' };
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Section>
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <Icon name="progress_activity" className="animate-spin text-[32px] text-primary" />
            <p className="text-sm text-muted-foreground">Loading uploads...</p>
          </div>
        </Card>
      </Section>
    );
  }

  if (error) {
    return (
      <Section>
        <Card className="text-center">
          <Icon name="error" className="text-[32px] text-destructive" />
          <p className="mt-2 text-sm font-bold">Failed to load uploads</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again"}
          </p>
        </Card>
      </Section>
    );
  }

  const uploads = data?.uploads || [];

  return (
    <>
      <Section>
        <Card className="bg-accent/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="folder" className="text-[24px] text-primary" />
              <div>
                <p className="text-sm font-bold">Uploaded Documents</p>
                <p className="text-xs text-muted-foreground">
                  {uploads.length} {uploads.length === 1 ? 'file' : 'files'} uploaded
                </p>
              </div>
            </div>
            <Btn
              icon="add"
              onClick={() => navigate({ to: "/upload-file" })}
            >
              Upload
            </Btn>
          </div>
        </Card>
      </Section>

      {uploads.length === 0 ? (
        <Section>
          <Card className="text-center py-12">
            <Icon name="cloud_upload" className="text-[64px] text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-bold">No Uploads Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your medical reports to keep them organized
            </p>
            <div className="mt-6">
              <Btn
                icon="upload"
                onClick={() => navigate({ to: "/upload-file" })}
              >
                Upload Your First Report
              </Btn>
            </div>
          </Card>
        </Section>
      ) : (
        <Section title={`${uploads.length} ${uploads.length === 1 ? 'Upload' : 'Uploads'}`}>
          <div className="space-y-3">
            {uploads.map((upload) => {
              const typeConfig = getReportTypeConfig(upload.report_type);
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v2';
              const fileUrl = apiBaseUrl.replace('/api/v2', '') + upload.file_path;

              return (
                <Card key={upload.upload_id} className="overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Icon name="description" className="text-[24px] text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{upload.original_filename}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${typeConfig.color}`}>
                            <span>{typeConfig.emoji}</span>
                            <span>{typeConfig.label}</span>
                          </span>
                          {getStatusConfig(upload.status) && (
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${getStatusConfig(upload.status)?.color}`}>
                              <Icon name={getStatusConfig(upload.status)?.icon || ""} className="text-[14px]" />
                              <span>{getStatusConfig(upload.status)?.label}</span>
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(upload.file_size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(upload.upload_id, upload.original_filename)}
                      className="shrink-0 rounded-lg p-2 text-destructive hover:bg-destructive/10 transition"
                      title="Delete"
                    >
                      <Icon name="delete" className="text-[20px]" />
                    </button>
                  </div>

                  {/* Description */}
                  {upload.description && (
                    <div className="mt-3 rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">{upload.description}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Icon name="calendar_today" className="text-[16px]" />
                      <span>{formatDate(upload.uploaded_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="badge" className="text-[16px]" />
                      <span>ID: {upload.upload_id}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <Icon name="visibility" className="text-[18px]" />
                      <span>View</span>
                    </a>
                    <a
                      href={fileUrl}
                      download={upload.original_filename}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent py-2 text-sm font-semibold transition hover:bg-accent/80"
                    >
                      <Icon name="download" className="text-[18px]" />
                      <span>Download</span>
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}
