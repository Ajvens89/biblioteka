import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function GameDetailLoading() {
  return (
    <PageShell className="overflow-x-hidden pb-24 lg:pb-8" width="wide">
      <Skeleton className="mb-6 h-5 w-36" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>

        <div className="space-y-6">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-20 w-full rounded-xl" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>

          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </PageShell>
  );
}
