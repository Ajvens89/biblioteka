import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, className, eyebrow }: Props) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between md:mb-8",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h1 className="text-h2 text-foreground">{title}</h1>
        {description && (
          <p className="text-body max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
