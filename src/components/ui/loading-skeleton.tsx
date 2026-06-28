import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function GameCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("zf-game-card flex flex-col overflow-hidden", className)}>
      <Skeleton className="zf-game-card-cover h-[clamp(10rem,22vw,17.5rem)] w-full rounded-none" />
      <div className="space-y-2.5 p-3.5">
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-2 h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

export function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="zf-catalog-grid">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="zf-hero min-h-[420px] animate-pulse">
      <div className="zf-hero-inner space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="h-12 w-full max-w-xl rounded-md" />
      </div>
    </div>
  );
}
