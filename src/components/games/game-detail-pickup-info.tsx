import { MapPin, Timer } from "lucide-react";

type Props = {
  validityDays: number;
  foundationAddress: string;
};

/** Informacje o odbiorze — tuż przy CTA rezerwacji, bez wymyślania danych. */
export function GameDetailPickupInfo({ validityDays, foundationAddress }: Props) {
  return (
    <aside
      className="zf-game-pickup"
      aria-label="Informacje o odbiorze"
      data-testid="game-pickup-info"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Jak odebrać grę
      </p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            Odbiór w siedzibie: <strong className="text-foreground">{foundationAddress}</strong>
          </span>
        </li>
        <li className="flex gap-2">
          <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            Po zatwierdzeniu rezerwacji masz <strong className="text-foreground">{validityDays} dni</strong> na
            odbiór egzemplarza.
          </span>
        </li>
      </ul>
    </aside>
  );
}
