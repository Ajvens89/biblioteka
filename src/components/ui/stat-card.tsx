import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "accent" | "success" | "warning" | "danger";
};

const tones = {
  default: "border-border bg-card",
  primary: "border-primary/20 bg-primary/5",
  accent: "border-accent/25 bg-accent/8",
  success: "border-success/25 bg-success/8",
  warning: "border-warning/25 bg-warning/8",
  danger: "border-destructive/25 bg-destructive/8",
};

export function StatCard({ label, value, hint, href, icon, tone = "default" }: Props) {
  const inner = (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border p-4 transition-shadow md:p-5",
        tones[tone],
        href && "cursor-pointer hover:shadow-soft",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-primary/70">{icon}</span>}
      </div>
      <p className="font-display text-2xl font-medium tracking-tight tabular-nums md:text-3xl">
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
