import { Icon } from "@/components/aaha";
import { cn } from "@/lib/utils";

/** Subtle animated bars used while Aaha reads a reply aloud. */
export function VoiceWave({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-[3px]", className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{
            height: "14px",
            animation: `aaha-wave 900ms ease-in-out ${i * 120}ms infinite`,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </span>
  );
}

export function VoiceStatus({
  state,
  label,
  onStop,
  stopLabel,
}: {
  state: "listening" | "thinking" | "speaking";
  label: string;
  onStop?: () => void;
  stopLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-accent/60 px-4 py-3 text-primary">
      {state === "speaking" ? (
        <VoiceWave />
      ) : (
        <Icon
          name={state === "listening" ? "mic" : "graphic_eq"}
          className={state === "listening" ? "animate-pulse" : "animate-pulse text-[20px]"}
        />
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</p>
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
