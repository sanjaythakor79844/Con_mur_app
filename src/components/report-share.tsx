import { useState } from "react";
import { toast } from "sonner";
import { Card, Icon, Section } from "@/components/aaha";
import { downloadReportPdf, type ReportDoc } from "@/lib/report-pdf";

/** Download (real PDF), print, native share and copy-link actions for a health report. */
export function ReportShare({
  title,
  summary,
  document: doc,
}: {
  title: string;
  summary: string;
  /** Live report data used to generate the PDF. Falls back to the print dialog when absent. */
  document?: ReportDoc;
}) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (busy) return;
    if (!doc) {
      window.print();
      return;
    }
    setBusy(true);
    try {
      // Yield a frame so the disabled/loading state paints before the sync PDF work.
      await new Promise((r) => setTimeout(r, 0));
      const name = downloadReportPdf(doc);
      toast.success("Report downloaded", { description: name });
    } catch (e) {
      console.error("[report-pdf] generation failed", e);
      toast.error("We couldn't create your PDF", {
        description: "Please try again, or use Print and choose “Save as PDF”.",
      });
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const data = { title, text: summary.slice(0, 400), url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(`${title}\n\n${summary}\n\n${window.location.href}`);
      toast.success("Report copied", { description: "Paste it anywhere to share." });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const actions = [
    {
      icon: busy ? "progress_activity" : "download",
      label: busy ? "Generating…" : "Download Report",
      onClick: () => void download(),
      disabled: busy,
      spin: busy,
    },
    { icon: "print", label: "Print", onClick: () => window.print(), disabled: busy, spin: false },
    { icon: "ios_share", label: "Share", onClick: () => void share(), disabled: false, spin: false },
    { icon: "link", label: "Copy link", onClick: () => void copyLink(), disabled: false, spin: false },
  ];

  return (
    <Section title="Save or share this report" className="no-print">
      <Card>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                aria-busy={a.spin}
                className="flex min-h-[76px] w-full flex-col items-center justify-center gap-1 rounded-2xl bg-muted p-3 text-center active:scale-[0.98] disabled:opacity-60"
              >
                <Icon name={a.icon} className={`text-primary ${a.spin ? "animate-spin" : ""}`} />
                <span className="text-[11px] font-semibold leading-tight">{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Download saves a PDF of this report to your device. Print also offers “Save as PDF”.
        </p>
      </Card>
    </Section>
  );
}
