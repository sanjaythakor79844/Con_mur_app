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
