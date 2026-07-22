import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { formatCopyAvailability } from "@/lib/games/availability";
import { cn } from "@/lib/utils";

type Props = {
  available: number;
  total: number;
};

export function GameDetailAvailability({ available, total }: Props) {
  const isAvailable = available > 0;
  const noCopies = total === 0;
  const label = formatCopyAvailability(available, total);

  const Icon = noCopies ? CircleSlash : isAvailable ? CheckCircle2 : XCircle;

  return (
    <div
      className={cn(
        "zf-game-availability",
        isAvailable && "zf-game-availability--available",
        !isAvailable && !noCopies && "zf-game-availability--unavailable",
        noCopies && "zf-game-availability--empty",
      )}
      role="status"
      data-testid="game-availability-status"
    >
      <Icon className="h-6 w-6 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold leading-tight">
          {noCopies ? "Brak egzemplarzy" : isAvailable ? "W katalogu" : "Obecnie niedostępna"}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
