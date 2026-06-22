import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  testId?: string;
};

/** Karta wiersza tabeli na mobile (panel admin) */
export function MobileDataCard({ children, className, testId }: Props) {
  return (
    <article
      className={cn("admin-mobile-card space-y-3", className)}
      data-testid={testId}
    >
      {children}
    </article>
  );
}

export function MobileDataCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-3 md:hidden", className)}>{children}</div>;
}

export function MobileDataCardRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-2 text-sm", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 text-right font-medium">{children}</div>
    </div>
  );
}
