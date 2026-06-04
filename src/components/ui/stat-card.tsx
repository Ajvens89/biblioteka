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
  accent: "border-accent/30 bg-accent/10",
  success: "border-success/25 bg-success/10",
  warning: "border-warning/25 bg-warning/10",
  danger: "border-destructive/25 bg-destructive/10",
};

export function StatCard({ label, value, hint, href, icon, tone = "default" }: Props) {
  const inner = (
    <div
      className={cn(
        "card-elevated flex flex-col gap-2 p-5 transition-shadow hover:shadow-md",
        tones[tone],
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-small font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-primary opacity-80">{icon}</span>}
      </div>
      <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="text-small text-muted-foreground">{hint}</p>}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
