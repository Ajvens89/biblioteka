import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";

type Props = {
  gameTitle: string;
  available: number;
};

export function GameBorrowContact({ gameTitle, available }: Props) {
  const subject = encodeURIComponent(`Wypożyczenie: ${gameTitle}`);
  const body = encodeURIComponent(
    `Dzień dobry,\n\ninteresuje mnie wypożyczenie gry „${gameTitle}”.\n\nPozdrawiam`,
  );
  const mailto = `mailto:${FOUNDATION_LOAN_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <section
      id="wypozyczenie"
      className="zf-game-reservation rounded-[var(--radius-card)] border border-border/80 bg-card/60 p-5"
      data-testid="game-borrow-contact"
      aria-labelledby="borrow-contact-heading"
    >
      <div className="space-y-3">
        <p className="text-eyebrow">Wypożyczenie</p>
        <h2 id="borrow-contact-heading" className="font-display text-xl font-bold text-foreground">
          Zarezerwuj mailowo
        </h2>
        <p className="text-body text-muted-foreground">
          {available > 0
            ? "Gra jest w zbiorach biblioteki. Wyślij gotową wiadomość — ustalimy odbiór w Bielsku-Białej."
            : "Aby zapytać o dostępność i wypożyczenie, napisz do fundacji."}
        </p>
        <Button size="lg" className="min-h-12 w-full sm:w-auto" asChild>
          <a href={mailto}>
            <Mail className="h-4 w-4" aria-hidden />
            Zarezerwuj mailowo
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">{FOUNDATION_LOAN_EMAIL}</p>
      </div>
    </section>
  );
}
