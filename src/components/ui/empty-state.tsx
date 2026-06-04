import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
  testId?: string;
};

export function EmptyState({ title, description, icon, action, className, testId }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className,
      )}
      data-testid={testId}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-h3">{title}</h3>
      {description && (
        <p className="text-body mt-2 max-w-md text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button type="button" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
