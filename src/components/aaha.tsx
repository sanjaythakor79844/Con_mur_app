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
}: {
  children: ReactNode;
  nav?: boolean;
  className?: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
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
    <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur">
      {back ? (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.history.back()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-primary"
        >
          <Icon name="arrow_back" />
        </button>
      ) : (
        <span className="size-1" />
      )}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold">{tr(title)}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{tr(subtitle)}</p> : null}
      </div>
      <div className="shrink-0">{action}</div>
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
    <section className={cn("px-4 py-4", className)}>
      {title ? (
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-base font-bold">{tr(title)}</h2>
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
    <Tag className={cn("rounded-3xl border border-border/60 bg-card p-4 shadow-soft", className)}>
      {children}
    </Tag>
  );
}

type BtnProps = {
  children: ReactNode;
  to?: string;
  href?: string;
  variant?: "primary" | "soft" | "outline" | "ghost";
  size?: "lg" | "md";
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
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold transition-all active:scale-[0.98]",
    size === "lg" ? "min-h-14 px-6 text-base" : "min-h-11 px-4 text-sm",
    {
      primary: "bg-brand text-primary-foreground shadow-lifted",
      soft: "bg-accent text-accent-foreground",
      outline: "border-2 border-primary/25 bg-card text-primary",
      ghost: "text-primary",
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
      <Link to={to} className={base}>
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
    green: "bg-success/12 text-success",
    amber: "bg-warning/18 text-[color:var(--warning)]",
    red: "bg-danger/12 text-danger",
    info: "bg-info/12 text-info",
    brand: "bg-accent text-accent-foreground",
    neutral: "bg-muted text-muted-foreground",
  }[tone];
  const tr = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        tones,
      )}
    >
      {icon ? <Icon name={icon} className="text-[16px]" /> : null}
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
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-2xl",
          tone === "brand" ? "bg-accent text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{tr(title)}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{tr(subtitle)}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {trailing ?? <Icon name="chevron_right" />}
      </span>
    </div>
  );
  return (
    <Card className="p-3">
      {to ? (
        <Link to={to} className="block">
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
    <Card className="bg-soft border-accent/70">
      <div className="flex items-center gap-2 text-primary">
        <Icon name="volunteer_activism" />
        <h3 className="text-sm font-bold">{tr(title)}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{tr(text)}</p>
      <Btn to={to} size="md" className="mt-4" icon="near_me">
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
    <div className="flex gap-3 rounded-3xl bg-accent/60 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground">
        <Icon name="favorite" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-primary">{t("Aaha says")}</p>
        <p className="mt-1 text-sm text-accent-foreground">{children}</p>
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
      <div className="grid size-[76px] place-items-center rounded-full bg-card text-center">
        <span>
          <span className="block text-xl font-bold leading-none">{value}</span>
          <span className="block text-[10px] text-muted-foreground">{label}</span>
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
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-2.5 rounded-full", tone === "brand" ? "bg-brand" : "bg-success")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

const NAV = [
  { to: "/home", label: "Home", icon: "home" },
  { to: "/reports", label: "Reports", icon: "lab_profile" },
  { to: "/centres", label: "Centres", icon: "location_on" },
  { to: "/aaha", label: "Aaha", icon: "favorite" },
  { to: "/profile", label: "Profile", icon: "person" },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border/70 bg-card/95 px-2 pb-2 pt-1.5 backdrop-blur">
      <ul className="grid grid-cols-5">
        {NAV.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-muted-foreground"
              activeProps={{ className: "text-primary bg-accent/60" }}
            >
              <Icon name={item.icon} className="text-[22px]" />
              <span className="text-[11px] font-semibold">{t(item.label)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
