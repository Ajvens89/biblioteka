import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildPageQueryString } from "@/lib/pagination";

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
  testId?: string;
};

export function AdminPagination({ page, totalPages, basePath, params, testId = "admin-pagination" }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 pt-4"
      aria-label="Paginacja"
      data-testid={testId}
    >
      {page > 1 && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`${basePath}?${buildPageQueryString(params, page - 1)}`}>Poprzednia</Link>
        </Button>
      )}
      <span className="px-3 text-sm text-muted-foreground">
        Strona {page} z {totalPages}
      </span>
      {page < totalPages && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`${basePath}?${buildPageQueryString(params, page + 1)}`}>Następna</Link>
        </Button>
      )}
    </nav>
  );
}
