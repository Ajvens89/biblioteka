import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAvailabilityLabel } from "@/lib/games/availability";

type Props = {
  available: number;
  total: number;
  className?: string;
};

/**
 * Spójna plakietka dostępności gry: tekst + kolor + ikona (nigdy sam kolor).
 * Korzysta z centralnej logiki getAvailabilityLabel.
 */
export function AvailabilityBadge({ available, total, className }: Props) {
  const { label, variant } = getAvailabilityLabel(available, total);
  const Icon = total === 0 ? CircleSlash : available > 0 ? CheckCircle2 : XCircle;

  return (
    <Badge variant={variant} className={className} aria-label={`Dostępność: ${label}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}
