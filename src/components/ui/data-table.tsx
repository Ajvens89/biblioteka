import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Opakowanie tabeli admin — desktop, sticky header przez .admin-table */
export function DataTable({ children, className }: Props) {
  return (
    <div className={cn("hidden overflow-hidden rounded-md border border-border md:block", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTableElement({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <table className={cn("admin-table w-full min-w-[640px] text-sm", className)}>{children}</table>;
}
