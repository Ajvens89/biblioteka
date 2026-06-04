import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
};

export function SectionCard({ id, title, description, children, className, action }: Props) {
  return (
    <section id={id} className={cn("card-elevated overflow-hidden", className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 bg-muted/30 px-5 py-4 md:px-6">
          <div className="space-y-1">
            {title && <h2 className="text-h3">{title}</h2>}
            {description && <p className="text-small text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
