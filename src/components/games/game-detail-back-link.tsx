import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function GameDetailBackLink() {
  return (
    <Link
      href="/katalog"
      className="zf-game-back inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      Wróć do katalogu
    </Link>
  );
}
