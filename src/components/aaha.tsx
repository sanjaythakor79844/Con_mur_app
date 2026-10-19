import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/** Translates plain-string children/props so every screen follows the chosen language. */
function useT() {
  const { t } = useI18n();
  return (value: ReactNode): ReactNode => (typeof value === "string" ? t(value) : value);
}

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-rounded leading-none select-none", className)}
    >
      {name}
    </span>
  );
}

/** Mobile canvas: every screen renders inside this centered phone-width column. */
export function Screen({
  children,
  nav = true,
  className,
  containerClassName,
}: {
  children: ReactNode;
  nav?: boolean;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen min-h-[100dvh] w-full max-w-md flex-col bg-background",
        containerClassName,
      )}
    >
      <div className={cn("flex-1", nav && "pb-28", className)}>{children}</div>
      {nav ? <BottomNav /> : null}
    </div>
  );
}

export function TopBar({
  title,
  subtitle,
  back = true,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  const tr = useT();
  return (
    <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-card/95 px-4 py-2.5 backdrop-blur-md sm:px-6">
      {back ? (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.history.back()}
          className="grid size-11 min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-xl border border-border/80 bg-muted/60 text-foreground transition-all hover:bg-muted hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>
      ) : (
        <span className="size-2" />
      )}
      <div className="min-w-0">
        <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
          {tr(title)}
        </h1>
        {subtitle ? (
          <p className="truncate text-xs font-medium text-muted-foreground">{tr(subtitle)}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end">{action}</div>
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tr = useT();
  return (
    <section className={cn("px-4 py-4 sm:px-6", className)}>
      {title ? (
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">{tr(title)}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Card({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type BtnProps = {
  children: ReactNode;
  to?: string;
  href?: string;
  search?: Record<string, any>;
  variant?: "primary" | "soft" | "outline" | "ghost";
  size?: "lg" | "md" | "sm";
  className?: string;
  icon?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Btn({
  children,
  to,
  href,
  search,
  variant = "primary",
  size = "lg",
  className,
  icon,
  onClick,
  type = "button",
  disabled = false,
}: BtnProps) {
  const tr = useT();
  const base = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-[14px] font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    size === "lg"
      ? "h-[54px] min-h-[54px] px-5 text-[15px]"
      : size === "sm"
      ? "h-9 min-h-[36px] px-3 text-xs"
      : "h-11 min-h-[44px] px-4 text-sm",
    {
      primary:
        "bg-primary text-primary-foreground shadow-lifted hover:brightness-105 active:brightness-95",
      soft: "bg-accent text-accent-foreground hover:bg-accent/80",
      outline: "border border-primary/30 bg-card text-primary hover:bg-accent/30",
      ghost: "text-primary hover:bg-muted/50",
    }[variant],
    disabled && "pointer-events-none opacity-60",
    className,
  );
  const inner = (
    <>
      {icon ? <Icon name={icon} /> : null}
      {tr(children)}
    </>
  );
  if (to)
    return (
      <Link to={to} search={search as any} className={base}>
        {inner}
      </Link>
    );
  if (href) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        className={base}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {inner}
    </button>
  );
}

export function Pill({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "info" | "neutral" | "brand";
  icon?: string;
}) {
  const tones = {
    green: "bg-success/12 text-success border border-success/20",
    amber: "bg-warning/15 text-warning border border-warning/25",
    red: "bg-danger/12 text-danger border border-danger/20",
    info: "bg-info/12 text-info border border-info/20",
    brand: "bg-accent text-accent-foreground border border-accent-foreground/15",
    neutral: "bg-muted text-muted-foreground border border-border/80",
  }[tone];
  const tr = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        tones,
      )}
    >
      {icon ? <Icon name={icon} className="text-[15px]" /> : null}
      {tr(children)}
    </span>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  to,
  trailing,
  tone = "brand",
}: {
  icon: string;
  title: string;
  subtitle?: string;
  to?: string;
  trailing?: ReactNode;
  tone?: "brand" | "muted";
}) {
  const tr = useT();
  const body = (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
      <span
        className={cn(
          "grid size-11 min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-2xl transition-colors",
          tone === "brand" ? "bg-accent text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{tr(title)}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {tr(subtitle)}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {trailing ?? <Icon name="chevron_right" className="text-[20px]" />}
      </span>
    </div>
  );
  return (
    <Card className="p-3 transition-colors hover:border-primary/40 active:bg-accent/20">
      {to ? (
        <Link
          to={to}
          className="block min-h-[44px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

/** Encourages a visit to an Aaha Health Centre without reading like an ad. */
export function NextStepCard({
  title = "Your next step",
  text = "A short visit to an Aaha Health Centre helps you turn these results into a simple plan with a doctor.",
  to = "/centres",
  cta = "Find a nearby centre",
}: {
  title?: string;
  text?: string;
  to?: string;
  cta?: string;
}) {
  const tr = useT();
  return (
    <Card className="bg-soft border-border/80">
      <div className="flex items-center gap-2.5 text-primary">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-primary">
          <Icon name="volunteer_activism" className="text-[18px]" />
        </span>
        <h3 className="text-sm font-bold text-foreground">{tr(title)}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tr(text)}</p>
      <Btn to={to} size="md" className="mt-3.5" icon="near_me">
        {cta}
      </Btn>
    </Card>
  );
}

/** Keeps the care workflow connected: shows where this screen leads next. */
export function FlowNav({
  steps,
  label = "Continue your journey",
}: {
  steps: { to: string; title: string; subtitle?: string; icon: string }[];
  label?: string;
}) {
  return (
    <Section title={label}>
      <ul className="space-y-3">
        {steps.map((s) => (
          <li key={s.to}>
            <Row icon={s.icon} title={s.title} subtitle={s.subtitle} to={s.to} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function AahaSays({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-3 rounded-2xl border border-accent-foreground/15 bg-accent/60 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground shadow-sm">
        <Icon name="favorite" className="text-[20px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("Aaha says")}</p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{children}</p>
      </div>
    </div>
  );
}

export function Ring({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="grid size-24 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--accent) 0deg)`,
      }}
      role="img"
      aria-label={`${label}: ${value} out of 100`}
    >
      <div className="grid size-[76px] place-items-center rounded-full bg-card text-center shadow-inner">
        <span>
          <span className="block text-2xl font-bold leading-none tracking-tight text-foreground">
            {value}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </span>
      </div>
    </div>
  );
}

export function Bar({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span className="font-bold text-foreground">{value}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-2.5 rounded-full transition-all duration-500",
            tone === "brand"
              ? "bg-primary"
              : tone === "success"
                ? "bg-success"
                : tone === "warning"
                  ? "bg-warning"
                  : "bg-danger",
          )}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

const NAV = [
  { to: "/home", label: "Today", icon: "today" },
  { to: "/reports", label: "Health", icon: "health_metrics" },
  { to: "/aaha", label: "Aaha", icon: "favorite", isMid: true },
  { to: "/appointments", label: "Care", icon: "calendar_month" },
  { to: "/profile", label: "Me", icon: "person" },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border/80 bg-card/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur-md">
      <ul className="grid grid-cols-5">
        {NAV.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={cn(
                "flex min-h-[58px] min-w-[48px] flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                item.isMid && "text-foreground gap-0.5",
              )}
              activeProps={{ className: "text-primary font-bold" }}
            >
              {item.isMid ? (
                <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lifted transition-transform active:scale-95">
                  <Icon name={item.icon} className="text-[20px]" />
                </span>
              ) : (
                <Icon name={item.icon} className="text-[24px]" />
              )}
              <span className="text-[12px] font-semibold">{t(item.label)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
