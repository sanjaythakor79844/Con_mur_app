import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Icon, Pill, Btn, Card } from "@/components/aaha";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface ResultMarker {
  name: string;
  status: string;
  cls: "s-ok" | "s-warn" | "s-alert";
  val: string | number;
  unit?: string;
  pos: number;
  was?: string | number;
  say?: string;
  refRange?: string;
}

/**
 * Calculates a marker's position on a 0-100 scale:
 * 0% - 30%: Low zone
 * 30% - 70%: In-range healthy band
 * 70% - 100%: High zone
 */
export function calculateMarkerPosition(
  value: string | number,
  refRange?: string,
  status?: string,
): number {
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isFinite(num) && refRange) {
    const rangeMatch = refRange.match(/([0-9.]+)\s*[-–—to]+\s*([0-9.]+)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      if (max > min) {
        if (num >= min && num <= max) {
          return Math.round(30 + ((num - min) / (max - min)) * 40);
        }
        if (num < min) {
          const ratio = min > 0 ? num / min : 0.5;
          return Math.max(8, Math.round(30 * Math.max(0, Math.min(1, ratio))));
        }
        if (num > max) {
          const excess = (num - max) / (max || 1);
          return Math.min(92, Math.round(70 + 22 * Math.min(1, excess)));
        }
      }
    }
  }

  // Fallback heuristics based on status label
  const s = (status || "").toLowerCase();
  if (s.includes("low")) return 14;
  if (s.includes("slightly") || s.includes("elevated") || s.includes("moderate")) return 78;
  if (s.includes("high") || s.includes("alert") || s.includes("critical")) return 85;
  return 50; // In range
}

/**
 * Maps a test row or reading to a ResultMarker structure matching the reference design.
 */
export function mapToResultMarker(input: {
  name: string;
  value: string | number;
  unit?: string;
  refRange?: string;
  status?: string;
  note?: string;
  previousValue?: string | number;
}): ResultMarker {
  const s = (input.status || "").toLowerCase();
  let cls: "s-ok" | "s-warn" | "s-alert" = "s-ok";
  let displayStatus = input.status || "In range";

  if (s.includes("normal") || s.includes("in range") || s.includes("optimal") || s.includes("ok")) {
    cls = "s-ok";
    displayStatus = "In range";
  } else if (
    s.includes("slightly") ||
    s.includes("elevated") ||
    s.includes("moderate") ||
    s.includes("attention") ||
    s.includes("warn")
  ) {
    cls = "s-warn";
    displayStatus = "Slightly high";
  } else if (s.includes("low")) {
    cls = "s-alert";
    displayStatus = "Low";
  } else if (s.includes("high") || s.includes("alert") || s.includes("danger") || s.includes("critical")) {
    cls = "s-alert";
    displayStatus = "High";
  }

  const pos = calculateMarkerPosition(input.value, input.refRange, displayStatus);

  return {
    name: input.name,
    status: displayStatus,
    cls,
    val: input.value,
    unit: input.unit || "",
    pos,
    was: input.previousValue,
    say: input.note,
    refRange: input.refRange,
  };
}

/**
 * Result Marker Card matching the exact `.card.mk` design from the HTML prototype.
 */
export function ResultMarkerCard({
  marker,
  explain = true,
}: {
  marker: ResultMarker;
  explain?: boolean;
}) {
  const { t } = useI18n();

  const statusColorClass =
    marker.cls === "s-ok" ? "text-success" : marker.cls === "s-warn" ? "text-warning" : "text-danger";

  const dotBgClass =
    marker.cls === "s-ok" ? "bg-success" : marker.cls === "s-warn" ? "bg-warning" : "bg-danger";

  return (
    <div className="card mk rounded-[24px] border border-border bg-card p-4 flex flex-col gap-2.5 shadow-soft transition-all">
      {/* Top bar: Name + status on left, Value + unit on right */}
      <div className="mk-top flex justify-between items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mk-n text-[15px] font-semibold text-foreground truncate">
            {marker.name}
          </div>
          <div className={cn("mk-s text-[12px] font-semibold mt-0.5", statusColorClass)}>
            {t(marker.status)}
            {marker.was ? (
              <span className="text-muted-foreground font-normal ml-1">
                ({t("was")} {marker.was})
              </span>
            ) : null}
          </div>
        </div>

        <div className="mk-v flex items-baseline gap-1 shrink-0 whitespace-nowrap">
          <b className="text-[22px] font-bold font-stretch-85 leading-none text-foreground tracking-tight">
            {marker.val}
          </b>
          {marker.unit ? (
            <span className="text-[12px] text-muted-foreground">{marker.unit}</span>
          ) : null}
        </div>
      </div>

      {/* Visual Range bar */}
      <div className="pt-0.5">
        <div className="range relative h-2 rounded-full bg-muted my-1 overflow-visible">
          {/* Target Normal In-range Band (30% to 70%) */}
          <i
            className="band absolute left-[30%] w-[40%] top-0 h-2 rounded-full pointer-events-none"
            style={{ backgroundColor: "var(--band, #BFE5D9)" }}
          />
          {/* Value Dot indicator */}
          <i
            className={cn(
              "dot absolute -top-1 -ml-2 size-4 rounded-full border-[3px] border-card shadow-sm transition-all duration-700 ease-out",
              dotBgClass,
            )}
            style={{ left: `${Math.max(5, Math.min(95, marker.pos))}%` }}
          />
        </div>

        {/* Range Labels: Low | In range | High */}
        <div className="range-l grid grid-cols-[30%_40%_30%] text-[12px] text-muted-foreground text-center mt-1 select-none">
          <span>{t("Low")}</span>
          <span>{t("In range")}</span>
          <span>{t("High")}</span>
        </div>
      </div>

      {/* Laboratory Reference Range (distinguished from general visual band) */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
        <span className="font-medium">{t("Lab reference range")}:</span>
        <span className="font-semibold text-foreground/80">
          {marker.refRange ? marker.refRange : t("Not specified")}
        </span>
      </div>

      {/* Clinical Plain-Language Explanation */}
      {explain && marker.say ? (
        <div className="mk-e pt-2 border-t border-border/40">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-0.5">
            {t("Explanation")}
          </div>
          <p className="m-0 text-[14px] leading-relaxed text-foreground/90">
            {marker.say}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Score Dial Hero card matching the prototype `.hero` section.
 */
export function ResultScoreHero({
  score,
  previousScore,
  message,
}: {
  score?: number | null;
  previousScore?: number | null;
  message?: string;
}) {
  const { t } = useI18n();
  const hasScore = typeof score === "number" && !isNaN(score);
  const currentScore = hasScore ? score : null;
  const arcLength = 395.8;
  const circumference = 527.8;
  const arcDash =
    currentScore !== null
      ? `${(arcLength * (Math.max(0, Math.min(100, currentScore)) / 100)).toFixed(1)} ${circumference}`
      : `0 ${circumference}`;

  const defaultMessage =
    previousScore && currentScore !== null && previousScore !== currentScore
      ? t(`Your score moved from ${previousScore} to ${currentScore} now that Aaha has your lab values.`)
      : t("Your health score has been updated with your latest laboratory results.");

  return (
    <section className="hero bg-hero text-white rounded-[28px] p-5 pb-6 flex flex-col items-center gap-2 shadow-soft">
      <div className="w-full flex justify-between items-center text-[12px] text-[#E3BFC9]">
        <span className="font-bold tracking-widest text-[#FFD3DF] uppercase">
          {t("Aaha score")}
        </span>
        <span>{hasScore ? t("Verified score") : t("Pending check-up")}</span>
      </div>

      <div className="relative shrink-0 w-[180px] h-[153px] flex flex-col items-center justify-center pt-2">
        <svg
          width="180"
          height="153"
          viewBox="0 0 200 170"
          fill="none"
          aria-hidden="true"
          className="absolute inset-0 transition-all duration-1000"
        >
          <circle
            cx="100"
            cy="100"
            r="84"
            stroke="var(--track, #B04869)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            transform="rotate(135 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r="84"
            stroke="var(--arc, #FF7A9E)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={arcDash}
            transform="rotate(135 100 100)"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="text-[64px] leading-none font-bold z-10 font-stretch-80">
          {currentScore !== null ? currentScore : "--"}
        </div>
        <div className="text-[12px] text-[#E3BFC9] z-10">
          {currentScore !== null ? t("out of 100") : t("No score recorded")}
        </div>
      </div>

      <p className="hero-p m-0 text-[15px] font-semibold text-center leading-snug text-white/95 mt-1 max-w-[320px]">
        {message || defaultMessage}
      </p>
    </section>
  );
}

/**
 * Next Step Consultation card matching the prototype.
 */
export function ResultNextStepCard({
  reason,
  speciality,
}: {
  reason?: string;
  speciality?: string;
}) {
  const { t } = useI18n();

  return (
    <section className="card rounded-[24px] border border-border bg-card p-4 flex flex-col gap-2 shadow-soft">
      <div className="text-[12px] font-bold uppercase tracking-wider text-primary">
        {t("Next step")}
      </div>
      <h2 className="text-[18px] font-bold leading-snug m-0 text-foreground">
        {t("Review these results with a doctor")}
      </h2>
      <p className="text-[14px] text-muted-foreground m-0 leading-relaxed">
        {reason ||
          t("Low iron and slightly high thyroid readings are both common and manageable with a personalized care plan.")}
      </p>
      <Btn to="/appointments" className="mt-2" icon="calendar_today">
        {speciality ? `${t("Book")} ${speciality}` : t("Book a consultation")}
      </Btn>
    </section>
  );
}

/**
 * Complete Result Explanation Section container matching the reference HTML.
 */
export function ResultExplanationSection({
  markers,
  score,
  previousScore,
  scoreMessage,
  consultationReason,
  speciality,
  showHero = true,
  showNextStep = true,
  actionButton,
}: {
  markers: ResultMarker[];
  score?: number | null;
  previousScore?: number | null;
  scoreMessage?: string;
  consultationReason?: string;
  speciality?: string;
  showHero?: boolean;
  showNextStep?: boolean;
  actionButton?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      {/* 1. Score Dial Hero */}
      {showHero && score !== undefined && score !== null ? (
        <ResultScoreHero
          score={score}
          previousScore={previousScore}
          message={scoreMessage}
        />
      ) : null}

      {/* 2. Marker Cards List */}
      <div className="space-y-3">
        {markers.map((m, idx) => (
          <ResultMarkerCard key={`${m.name}-${idx}`} marker={m} explain={true} />
        ))}
      </div>

      {/* 3. Next step consultation card */}
      {showNextStep ? (
        <ResultNextStepCard reason={consultationReason} speciality={speciality} />
      ) : null}

      {/* 4. Action button (e.g. Go to Today / Back to reports) */}
      {actionButton ? actionButton : null}

      {/* 5. Medical disclaimer matching prototype */}
      <p className="fine m-0 text-[13px] text-muted-foreground text-center pt-1 pb-2">
        {t("Aaha explains your results. It does not replace a doctor.")}
      </p>
    </div>
  );
}
