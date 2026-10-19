import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Liv Monochrome Scope / Container ─────────────────────────────────────────

export interface LivScopeProps {
  theme?: "dark" | "light";
  children: ReactNode;
  className?: string;
  as?: "div" | "main" | "section";
}

export function LivScope({
  theme = "dark",
  children,
  className,
  as: Component = "div",
}: LivScopeProps) {
  return (
    <Component
      data-app={theme}
      className={cn(
        "liv-scope text-[15px] leading-[1.45] font-sans antialiased text-[var(--liv-text)] bg-[var(--liv-bg)] transition-colors duration-200",
        theme === "light" ? "liv-light" : "liv-dark",
        className,
      )}
    >
      {children}
    </Component>
  );
}

// ─── Liv Cards (Surface & Inversion) ──────────────────────────────────────────

export interface LivCardProps {
  variant?: "default" | "inverted" | "empty";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "div" | "button" | "section" | "article";
}

export function LivCard({
  variant = "default",
  children,
  className,
  onClick,
  as: Component = onClick ? "button" : "div",
}: LivCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "liv-card text-left transition-transform duration-150",
        variant === "inverted" && "inv",
        variant === "empty" && "border-dashed text-center items-center py-7 px-5",
        isClickable && "active:scale-[0.985] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--liv-text)]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

// ─── Liv Typography ───────────────────────────────────────────────────────────

export interface LivHeadingProps {
  level?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

export function LivHeading({ level = 1, children, className }: LivHeadingProps) {
  if (level === 1) {
    return <h1 className={cn("liv-h1 text-[var(--liv-text)]", className)}>{children}</h1>;
  }
  if (level === 2) {
    return <h2 className={cn("liv-h2 text-[var(--liv-text)]", className)}>{children}</h2>;
  }
  return <h3 className={cn("liv-h3 text-[var(--liv-text)]", className)}>{children}</h3>;
}

export function LivLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("liv-k", className)}>{children}</span>;
}

export function LivNumber({
  children,
  size = "md",
  className,
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-[22px]",
    md: "text-[28px]",
    lg: "text-[40px]",
    xl: "text-[68px]",
  }[size];

  return <span className={cn("liv-num", sizeClasses, className)}>{children}</span>;
}

export function LivUnit({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("liv-unit", className)}>{children}</span>;
}

export function LivSubtext({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("liv-sub", className)}>{children}</p>;
}

// ─── Liv Status Pills (Form Over Hue) ─────────────────────────────────────────

export type LivPillTone = "priority" | "borderline" | "optimal" | "p" | "b" | "o";

export interface LivPillProps {
  tone?: LivPillTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function LivPill({ tone = "optimal", children, className, icon }: LivPillProps) {
  const toneClass =
    tone === "priority" || tone === "p"
      ? "p"
      : tone === "borderline" || tone === "b"
        ? "b"
        : "o";

  const defaultIcon =
    toneClass === "p" ? "▲" : toneClass === "b" ? "◆" : "●";

  return (
    <span className={cn("liv-pill", toneClass, className)}>
      <span aria-hidden className="text-[9px] leading-none opacity-80">
        {icon ?? defaultIcon}
      </span>
      <span>{children}</span>
    </span>
  );
}

// ─── Liv Range Bar (Optimal, Borderline, Priority) ─────────────────────────────

export interface RangeZone {
  upperBound: number;
  tone: "o" | "b" | "p";
}

export interface LivRangeBarProps {
  min: number;
  max: number;
  value: number;
  zones?: RangeZone[];
  labelLeft?: ReactNode;
  labelRight?: ReactNode;
  className?: string;
}

export function LivRangeBar({
  min,
  max,
  value,
  zones = [
    { upperBound: min + (max - min) * 0.4, tone: "o" },
    { upperBound: min + (max - min) * 0.75, tone: "b" },
    { upperBound: max, tone: "p" },
  ],
  labelLeft,
  labelRight,
  className,
}: LivRangeBarProps) {
  const span = Math.max(0.001, max - min);
  const rawPercent = ((value - min) / span) * 100;
  // Clamped between 3% and 97% as defined in the Liv specification
  const clampedPercent = Math.max(3, Math.min(97, rawPercent));

  let prev = min;

  return (
    <div className={cn("w-full flex flex-col gap-1.5", className)}>
      <div className="liv-rb" aria-hidden="true">
        {zones.map((zone, idx) => {
          const flexRatio = (zone.upperBound - prev) / span;
          prev = zone.upperBound;
          const zoneClass =
            zone.tone === "o" ? "zo" : zone.tone === "b" ? "zb" : "zp";

          return (
            <i
              key={idx}
              className={zoneClass}
              style={{ flex: Math.max(0.01, flexRatio).toFixed(3) }}
            />
          );
        })}
        <b
          style={{ left: `${clampedPercent.toFixed(1)}%` }}
          data-l={`${clampedPercent.toFixed(1)}%`}
        />
      </div>

      {(labelLeft || labelRight) && (
        <div className="liv-rbl">
          <span>{labelLeft}</span>
          <span>{labelRight}</span>
        </div>
      )}
    </div>
  );
}

// ─── Liv Progress Ring (SVG Circular Gauge) ───────────────────────────────────

export interface LivProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 1
  children?: ReactNode;
  onBg?: boolean;
  className?: string;
}

export function LivProgressRing({
  size = 118,
  strokeWidth = 7,
  progress = 0,
  children,
  onBg = false,
  className,
}: LivProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const center = size / 2;

  return (
    <div
      className={cn("liv-ring", onBg && "on-bg", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle
          className="tr"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="ar"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference.toFixed(1)}
          style={{ strokeDashoffset: strokeDashoffset.toFixed(1) }}
          data-off={strokeDashoffset.toFixed(1)}
        />
      </svg>
      {children && <div className="mid">{children}</div>}
    </div>
  );
}

// ─── Liv Full-Pill Button ─────────────────────────────────────────────────────

export interface LivButtonProps {
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function LivButton({
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  children,
  className,
  icon,
}: LivButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "liv-btn",
        variant === "ghost" && "ghost",
        size === "sm" && "sm",
        className,
      )}
    >
      {icon && <span aria-hidden className="shrink-0 leading-none">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

// ─── Liv Segmented Control ────────────────────────────────────────────────────

export interface LivSegmentedOption<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

export interface LivSegmentedProps<T extends string = string> {
  options: LivSegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function LivSegmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Segmented control",
}: LivSegmentedProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );
  const count = Math.max(1, options.length);

  return (
    <div
      className={cn("liv-seg", className)}
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className="thumb"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={isSelected}
            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--liv-text)]"
          >
            {opt.icon && <span aria-hidden className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Liv Animated Mark (Logo) ────────────────────────────────────────────────

export function LivMark({
  size = 64,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={cn("liv-mark block", className)}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="dots"
        cx="60"
        cy="60"
        r="56"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      <circle
        className="arc"
        cx="60"
        cy="60"
        r="48"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <circle className="core" cx="60" cy="60" r="24" fill="currentColor" />
    </svg>
  );
}

// ─── Liv Marker Row (Form over Hue with Verified Data) ────────────────────────

export interface LivMarkerRowProps {
  name: string;
  value?: string | number | null;
  unit?: string | null;
  status?: "optimal" | "borderline" | "priority" | "o" | "b" | "p" | "unknown";
  statusLabel?: string;
  clinicalRefRange?: string | null;
  rangeBar?: ReactNode;
  reportOrigin?: string | null;
  onClick?: () => void;
  className?: string;
}

export function LivMarkerRow({
  name,
  value,
  unit,
  status,
  statusLabel,
  clinicalRefRange,
  rangeBar,
  reportOrigin,
  onClick,
  className,
}: LivMarkerRowProps) {
  const isClickable = Boolean(onClick);
  const isAvailable = value !== undefined && value !== null && String(value).trim() !== "";
  const displayVal = isAvailable ? String(value) : "Not available in this report";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "liv-mrow group",
        !isClickable && "cursor-default",
        className,
      )}
    >
      <div className="top">
        <span className="n">{name}</span>
        {isAvailable ? (
          <>
            <span className="v">{displayVal}</span>
            {unit && <span className="unit font-mono text-[11px] text-[var(--liv-muted)]">{unit}</span>}
          </>
        ) : (
          <span className="text-[12px] font-mono italic text-[var(--liv-muted)]">
            Not available in this report
          </span>
        )}
      </div>

      {rangeBar && <div className="mt-2">{rangeBar}</div>}

      <div className="liv-rbl mt-2 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 truncate">
          {clinicalRefRange ? (
            <span className="truncate">
              Clinical range: <span className="font-mono text-[var(--liv-text)]">{clinicalRefRange}</span>
            </span>
          ) : (
            <span className="text-[var(--liv-muted)]">Verified reading</span>
          )}
          {reportOrigin && (
            <span className="text-[10px] text-[var(--liv-muted)] opacity-70">
              · {reportOrigin}
            </span>
          )}
        </div>

        {isAvailable && status && status !== "unknown" && (
          <LivPill tone={status}>
            {statusLabel || (status === "priority" || status === "p" ? "Priority" : status === "borderline" || status === "b" ? "Borderline" : "Optimal")}
          </LivPill>
        )}
      </div>
    </button>
  );
}

// ─── Liv Reference SVG Icons Map ─────────────────────────────────────────────

export const LIV_ICONS = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  drop: "M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5z",
  plan: "M10 6h10M10 12h10M10 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  cal: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 3.5v4M16 3.5v4",
  spark: "M12 4l1.8 4.7 4.7 1.8-4.7 1.8L12 17l-1.8-4.7-4.7-1.8 4.7-1.8zM19 15.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z",
  chev: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  up: "M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19h14",
  down: "M12 5v11M7.5 11.5 12 16l4.5-4.5M5 19h14",
  cam: "M4 8h3l1.5-2h7L17 8h3v11H4zM12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z",
  file: "M7 3.5h7l4 4v13H6.5v-17zM14 3.5v4h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1-3.5 4-5 7.5-5s6.5 1.5 7.5 5",
  pause: "M9 6v12M15 6v12",
  play: "M8 5.5v13l10-6.5z",
  send: "M5 12h13M13 6l6 6-6 6",
  share: "M12 15V4M8 8l4-4 4 4M5 13v6h14v-6",
  shield: "M12 3.5l7 2.5v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6z",
  flame: "M12 3.5c.5 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-1.5.5-2.5 1.5-3.5.5 1.5 1.5 2 1.5 2 0-3 .5-5.5 1.5-8z",
  moon: "M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z",
  redo: "M5 12a7 7 0 1 1 2.5 5.4M5 18v-4h4",
} as const;

export type LivIconName = keyof typeof LIV_ICONS;

export function LivIcon({
  name,
  size = 22,
  strokeWidth = 1.6,
  className,
}: {
  name: LivIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const path = LIV_ICONS[name] || LIV_ICONS.spark;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

// ─── Liv Stories (Video Holder / Onboarding Carousel) ─────────────────────────

export interface StorySlide {
  h: string;
  p: string;
  v: ReactNode;
}

export const LIV_SIGNUP_STORIES: StorySlide[] = [
  {
    h: "It starts at the Living Lab kiosk.",
    p: "One screening reads your blood, heart and body. Your longevity report arrives here by itself.",
    v: (
      <>
        <circle className="pulse" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
        <circle className="pulse d2" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="46" cy="46" r="6" fill="currentColor" />
      </>
    ),
  },
  {
    h: "Normal is not the same as optimal.",
    p: "Clinical ranges show where illness begins. Longevity-optimal ranges show where healthspan is built. We hold you to the second.",
    v: (
      <>
        <path d="M6 46h30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M42 46h20" stroke="currentColor" strokeWidth="5" strokeDasharray="2 4" />
        <path d="M68 46h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
        <g className="slide">
          <circle cx="62" cy="46" r="8" fill="var(--surf, #141415)" stroke="currentColor" strokeWidth="2" />
          <circle cx="62" cy="46" r="3" fill="currentColor" />
        </g>
      </>
    ),
  },
  {
    h: "Meet your AIWS.",
    p: "Active Integrated Wellness Score: your blood, body, heart, sleep and lifestyle, combined into one number out of 100. Your total well-being benchmark, re-measured at every visit.",
    v: (
      <>
        <circle cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <circle
          className="ringdraw"
          cx="46"
          cy="46"
          r="36"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          transform="rotate(-90 46 46)"
        />
        <text
          x="46"
          y="56"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontSize="30"
          fontWeight="500"
        >
          69
        </text>
      </>
    ),
  },
  {
    h: "Measure. Act. Re-measure.",
    p: "A 90-day plan, a care team and Liv by your side until your next kiosk visit.",
    v: (
      <>
        <path d="M13 60 46 38 79 60" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" />
        <circle cx="13" cy="60" r="3" fill="currentColor" />
        <circle cx="46" cy="38" r="3" fill="currentColor" />
        <circle cx="79" cy="60" r="3" fill="currentColor" />
        <circle className="hop" cx="13" cy="60" r="9" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  },
];

export function LivStories({
  stories = LIV_SIGNUP_STORIES,
  className,
}: {
  stories?: StorySlide[];
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % stories.length);
    }, 5200);
    return () => clearTimeout(timer);
  }, [index, paused, stories.length]);

  const prev = () => setIndex((i) => (i - 1 + stories.length) % stories.length);
  const next = () => setIndex((i) => (i + 1) % stories.length);

  const cur = stories[index];

  return (
    <div
      className={cn("story", paused && "paused", className)}
      role="group"
      aria-label="What Liv is, in four short stories"
    >
      <div className="sbars">
        {stories.map((_, i) => (
          <i
            key={i}
            className={i < index ? "done" : i === index ? "on" : ""}
          />
        ))}
      </div>

      <div className="stop">
        <div className="who">
          <LivMark size={22} />
          <span>Liv</span>
          <span>{index + 1}/{stories.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Play story" : "Pause story"}
        >
          <LivIcon name={paused ? "play" : "pause"} size={18} />
        </button>
      </div>

      <div key={index} className="sbody-slot">
        <svg className="sv" viewBox="0 0 92 92" fill="none" aria-hidden="true">
          {cur.v}
        </svg>
        <div className="sbody">
          <h2>{cur.h}</h2>
          <p>{cur.p}</p>
        </div>
      </div>

      <button
        type="button"
        className="snav l"
        onClick={prev}
        aria-label="Previous story"
      />
      <button
        type="button"
        className="snav r"
        onClick={next}
        aria-label="Next story"
      />

      <span className="shint">Tap to skip</span>
    </div>
  );
}

// ─── Liv Bottom Navigation & Ask Liv FAB ──────────────────────────────────────

export type LivTabId = "home" | "markers" | "plan" | "care" | "profile";

export interface LivBottomNavProps {
  activeTab: LivTabId;
  onTabChange?: (tab: LivTabId) => void;
  onAskLiv?: () => void;
  className?: string;
}

export function LivBottomNav({
  activeTab,
  onTabChange,
  onAskLiv,
  className,
}: LivBottomNavProps) {
  const tabs = [
    { id: "home" as const, label: "Home", icon: "home" as const, href: "/home" },
    { id: "markers" as const, label: "Markers", icon: "drop" as const, href: "/reports?tab=markers" },
    { id: "plan" as const, label: "Plan", icon: "plan" as const, href: "/journey" },
    { id: "care" as const, label: "Care", icon: "cal" as const, href: "/appointments" },
    { id: "profile" as const, label: "Me", icon: "user" as const, href: "/profile" },
  ];

  return (
    <>
      {onAskLiv && (
        <button
          type="button"
          className="fab"
          onClick={onAskLiv}
          aria-label="Ask Liv"
        >
          <LivIcon name="spark" size={20} />
          <span>Ask Liv</span>
        </button>
      )}

      <nav className={cn("nav", className)} aria-label="Main">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={cn("tab", isActive && "on")}
              onClick={() => onTabChange ? onTabChange(tab.id) : (window.location.href = tab.href)}
              aria-current={isActive ? "page" : "false"}
            >
              <LivIcon name={tab.icon} size={22} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// ─── Liv Phone Shell Wrapper ──────────────────────────────────────────────────

export function LivPhone({
  children,
  theme = "dark",
  className,
}: {
  children: ReactNode;
  theme?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className="liv-phone-container">
      <div className={cn("phone", className)} data-app={theme}>
        <div id="app" className="app-root">
          {children}
        </div>
      </div>
    </div>
  );
}

