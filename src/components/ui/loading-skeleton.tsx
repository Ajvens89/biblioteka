import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function GameCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-elevated flex flex-col overflow-hidden", className)}>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}
