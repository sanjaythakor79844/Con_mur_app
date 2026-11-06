import type { Assessment, Report, WorkflowStatus } from "@/lib/aaha-api";
import { LivIcon } from "@/components/liv";

export interface ReportHistoryProps {
  assessments: Assessment[];
  uploadedReports: Report[];
  programmeStartDate: Date;
  programmeLength: number;
  retestDate: Date;
  currentDay: number;
  onViewReport: (assessment: Assessment) => void;
  onDownloadReport: (assessment: Assessment) => void;
  onViewUploadedReport: (report: Report) => void;
  expandedReportId: string | null;
  onToggleExpandReport: (reportId: string) => void;
  formatReportDate: (date: string) => string;
  getAssessmentSourceLabel: (assessment: Assessment) => string;
  onBookRetest: () => void;
}

export function ReportHistory({
  assessments,
  uploadedReports,
  programmeStartDate,
  programmeLength,
  retestDate,
  currentDay,
  onViewReport,
  onDownloadReport,
  onViewUploadedReport,
  expandedReportId,
  onToggleExpandReport,
  formatReportDate,
  getAssessmentSourceLabel,
  onBookRetest,
}: ReportHistoryProps) {
  // Calculate day number from programme start
  const calculateDayNumber = (dateString: string): number => {
    const reportDate = new Date(dateString);
    const daysDiff = Math.floor((reportDate.getTime() - programmeStartDate.getTime()) / 864e5);
    return Math.max(1, daysDiff + 1);
  };

  // Render workflow status badge
  const renderWorkflowBadge = (workflow?: WorkflowStatus) => {
    if (!workflow) return null;

    const statusStyles: Record<string, { bg: string; fg: string; label: string }> = {
      pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending Review" },
      uploaded: { bg: "#DBEAFE", fg: "#1E3A8A", label: "Under Review" },
      rejected: { bg: "#FEE2E2", fg: "#991B1B", label: "Rejected" },
      declined: { bg: "#F3F4F6", fg: "#374151", label: "Declined" },
      released: { bg: "#D1FAE5", fg: "#065F46", label: "Released" },
    };

    const style = statusStyles[workflow.status] || statusStyles.pending;

    return (
      <span
        className="pill"
        style={{
          backgroundColor: style.bg,
          color: style.fg,
          fontSize: "11px",
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: "4px",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
        }}
      >
        {style.label}
      </span>
    );
  };

  // Get biological age from assessment
  const getBiologicalAge = (assessment: Assessment): string | number => {
    const rawBio =
      (assessment as any)._raw?.biological_age ||
      (assessment as any)._raw?.report_data?.biological_age;
    if (typeof rawBio === "number" && !isNaN(rawBio)) return rawBio;
    
    if (typeof assessment.score === "number" && assessment.score > 0) {
      return Math.round(assessment.score);
    }
    
    return "—";
  };

  const latestAssessment = assessments[0];
  const isFirstReport = (index: number) => index === assessments.length - 1;

  if (!latestAssessment) {
    return (
      <div className="scroll">
        <div className="hd">
          <span>
            <span className="k">Your record</span>
            <h2 className="h2" style={{ marginTop: "6px" }}>
              Every report, dated.
            </h2>
          </span>
        </div>
        <p className="sub">
          One Longevity Report for every pod session, signed by your physician before it reaches you. View it here, or keep the PDF.
        </p>
        <div className="card empty" style={{ marginTop: "16px" }}>
          <h2 className="h2">No reports yet</h2>
          <p className="sub" style={{ marginTop: "8px" }}>
            Complete a screening at an Aaha Health Kiosk to see your reports here.
          </p>
        </div>
      </div>
    );
  }

  const latestDate = new Date(latestAssessment.created_at || Date.now());
  const latestBioAge = getBiologicalAge(latestAssessment);
  const latestDayNumber = calculateDayNumber(latestAssessment.created_at || new Date().toISOString());

  return (
    <div className="scroll">
      <div className="hd">
        <span>
          <span className="k">Your record</span>
          <h2 className="h2" style={{ marginTop: "6px" }}>
            Every report, dated.
          </h2>
        </span>
      </div>
      <p className="sub">
        One Longevity Report for every pod session, signed by your physician before it reaches you. View it here, or keep the PDF.
      </p>

      {/* Hero Card - Latest Report */}
      <div className="card inv rec-hero" style={{ marginTop: "16px" }}>
        <div className="hd" style={{ alignItems: "flex-start" }}>
          <span>
            <span className="k" style={{ color: "var(--inv-muted)" }}>
              Latest · {latestDate.getDate()}{" "}
              {latestDate.toLocaleDateString(undefined, { month: "short" })} ·{" "}
              {latestDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
            <span
              className="h2"
              style={{ display: "block", marginTop: "6px", fontSize: "26px" }}
            >
              Your Longevity Report
            </span>
            {/* Workflow Status Badge */}
            {latestAssessment.workflow && (
              <div style={{ marginTop: "8px" }}>
                {renderWorkflowBadge(latestAssessment.workflow)}
              </div>
            )}
            {/* Workflow Message (from backend) */}
            {latestAssessment.workflow?.message && (
              <p
                className="sub"
                style={{
                  marginTop: "8px",
                  color: "var(--inv-muted)",
                  fontSize: "13px",
                }}
              >
                {latestAssessment.workflow.message}
              </p>
            )}
            {/* Rejection Reason */}
            {latestAssessment.workflow?.status === "rejected" &&
              latestAssessment.workflow.rejection_reason && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    backgroundColor: "rgba(254, 226, 226, 0.3)",
                    borderRadius: "6px",
                    borderLeft: "3px solid #EF4444",
                  }}
                >
                  <span
                    className="k"
                    style={{
                      color: "#991B1B",
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Reason for rejection
                  </span>
                  <p
                    style={{
                      marginTop: "4px",
                      fontSize: "13px",
                      color: "#7F1D1D",
                      lineHeight: "1.4",
                    }}
                  >
                    {latestAssessment.workflow.rejection_reason}
                  </p>
                </div>
              )}
          </span>
          <span
            className="pill"
            style={{ border: "1px solid var(--inv-line)", color: "var(--inv-fg)" }}
          >
            Day {latestDayNumber}
          </span>
        </div>

        <div className="rec-big">
          <span>
            <span className="num" style={{ fontSize: "56px" }}>
              {latestBioAge}
            </span>{" "}
            <span className="unit" style={{ color: "var(--inv-muted)" }}>
              years · biological age
            </span>
          </span>
          <span className="rec-seal">
            <span className="sig" style={{ fontSize: "20px" }}>
              A. Deshmukh
            </span>
            <span className="k" style={{ color: "var(--inv-muted)", fontSize: "9.5px" }}>
              Signed · MD
            </span>
          </span>
        </div>

        <div className="rec-acts">
          <button
            type="button"
            className="btn sm"
            onClick={() => onViewReport(latestAssessment)}
          >
            <LivIcon name="file" size={15} />
            View
          </button>
          <button
            type="button"
            className={`btn sm rec-g ${
              !latestAssessment.report_pdf_url ||
              (latestAssessment.workflow && !latestAssessment.workflow.released)
                ? "disabled"
                : ""
            }`}
            onClick={() => onDownloadReport(latestAssessment)}
            disabled={
              !latestAssessment.report_pdf_url ||
              (latestAssessment.workflow && !latestAssessment.workflow.released)
            }
            style={
              !latestAssessment.report_pdf_url ||
              (latestAssessment.workflow && !latestAssessment.workflow.released)
                ? { opacity: 0.5 }
                : undefined
            }
            title={
              latestAssessment.workflow && !latestAssessment.workflow.released
                ? "PDF will be available once report is released"
                : !latestAssessment.report_pdf_url
                ? "PDF not available"
                : "Download PDF"
            }
          >
            <LivIcon name="down" size={15} />
            Download
          </button>
        </div>
      </div>

      {/* Up Next - Re-test Appointment */}
      <span className="k" style={{ marginTop: "10px", display: "block" }}>
        Up next
      </span>
      <div className="rec-day" style={{ marginTop: "6px" }}>
        <div className="rec-date next">
          <b>{retestDate.getDate()}</b>
          <span>
            {retestDate
              .toLocaleDateString(undefined, { month: "short" })
              .toUpperCase()}
          </span>
          <small>day {programmeLength}</small>
        </div>
        <div className="rec-col">
          <button
            type="button"
            className="rec-s"
            onClick={onBookRetest}
          >
            <span className="t">
              <span className="k rec-k">9:00 AM · Aaha pod · booked</span>
              <b>Day-{programmeLength} re-test</b>
              <small>
                Chapter 2 begins. We measure again, and watch the gap close.
              </small>
            </span>
            <LivIcon name="chev" size={16} />
          </button>
        </div>
      </div>

      {/* Chapter Progress */}
      <div className="rec-chh">
        <span className="k">
          Chapter 1 · Day {currentDay} of {programmeLength}
        </span>
        <span className="k" style={{ color: "var(--faint)" }}>
          {assessments.length} report{assessments.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="rec-prog">
        <i
          style={{
            width: `${((currentDay / programmeLength) * 100).toFixed(1)}%`,
          }}
        />
      </div>

      {/* Timeline - All Reports */}
      <div style={{ marginTop: "8px" }}>
        {assessments.map((assessment, idx) => {
          const reportDate = new Date(assessment.created_at || Date.now());
          const dayNumber = calculateDayNumber(assessment.created_at || new Date().toISOString());
          const bioAge = getBiologicalAge(assessment);
          const sourceLabel = getAssessmentSourceLabel(assessment);
          const isFirst = isFirstReport(idx);

          return (
            <div key={assessment.id} className="rec-day">
              <div className="rec-date">
                <b>{reportDate.getDate()}</b>
                <span>
                  {reportDate
                    .toLocaleDateString(undefined, { month: "short" })
                    .toUpperCase()}
                </span>
                <small>day {dayNumber}</small>
              </div>
              <div className="rec-col">
                <div className="rec-s rec-r">
                  <div className="rec-top">
                    <span className="t">
                      <span className="k rec-k">
                        {reportDate.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}{" "}
                        · {sourceLabel}
                        {isFirst ? " · first" : ""}
                      </span>
                      <b>Longevity Report</b>
                      <small>Signed · Dr. A. Deshmukh</small>
                      {/* Workflow status for each report */}
                      {assessment.workflow && (
                        <div style={{ marginTop: "6px" }}>
                          {renderWorkflowBadge(assessment.workflow)}
                        </div>
                      )}
                      {/* Workflow message */}
                      {assessment.workflow?.message && (
                        <small
                          style={{
                            display: "block",
                            marginTop: "6px",
                            color: "var(--muted)",
                            fontStyle: "italic",
                          }}
                        >
                          {assessment.workflow.message}
                        </small>
                      )}
                    </span>
                    <span className="rec-v">
                      <span className="num" style={{ fontSize: "24px" }}>
                        {bioAge}
                      </span>
                      <span className="unit">bio age</span>
                    </span>
                  </div>
                  <div className="rec-ab">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => onViewReport(assessment)}
                    >
                      <LivIcon name="file" size={14} />
                      View
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => onDownloadReport(assessment)}
                      disabled={
                        !assessment.report_pdf_url ||
                        (assessment.workflow && !assessment.workflow.released)
                      }
                      style={
                        !assessment.report_pdf_url ||
                        (assessment.workflow && !assessment.workflow.released)
                          ? { opacity: 0.5 }
                          : undefined
                      }
                      title={
                        assessment.workflow && !assessment.workflow.released
                          ? "PDF will be available once report is released"
                          : !assessment.report_pdf_url
                          ? "PDF not available"
                          : "Download PDF"
                      }
                    >
                      <LivIcon name="down" size={14} />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden as per requirement: "Uploaded documents history nahi dikhana" */}
      {/* Patient Uploaded Medical Documents - HIDDEN */}
      {/* {uploadedReports.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <span className="k">Uploaded Documents ({uploadedReports.length})</span>
          <div>...uploaded documents section hidden...</div>
        </div>
      )} */}

      <p
        className="sub"
        style={{ textAlign: "center", marginTop: "16px", marginBottom: "20px" }}
      >
        Stored encrypted in India · export or erase any time
      </p>
    </div>
  );
}
