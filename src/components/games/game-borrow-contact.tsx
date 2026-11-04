import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { getAppSettings } from "@/lib/settings";
import { buildBorrowContact } from "@/lib/public-loan-contact";
import { CopyBorrowContact } from "./copy-borrow-contact";

type Props = {
  gameTitle: string;
  available: number;
  gameUrl?: string;
};

export async function GameBorrowContact({ gameTitle, available, gameUrl }: Props) {
  const settings = await getAppSettings();
  const email = settings.contactEmail || FOUNDATION_LOAN_EMAIL;
  const { mailto, message } = buildBorrowContact({ gameTitle, gameUrl, email });

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
          Zapytaj o wypożyczenie
        </h2>
        <p className="text-body text-muted-foreground">
          {available > 0
            ? "W katalogu są wolne egzemplarze. Wyślij gotowe zapytanie — potwierdzimy dostępność i ustalimy odbiór."
            : "Obecnie nie ma wolnego egzemplarza. Napisz, a ustalimy możliwy termin wypożyczenia."}
        </p>
        <Button size="lg" className="h-auto min-h-12 w-full whitespace-normal text-center sm:w-auto" asChild>
          <a href={mailto}>
            <Mail className="h-4 w-4" aria-hidden />
            Napisz w sprawie gry
          </a>
        </Button>
        <p className="break-all text-sm text-muted-foreground">{email}</p>
        <p className="text-xs text-muted-foreground">
          Wysłanie wiadomości nie rezerwuje egzemplarza. Poczekaj na potwierdzenie od zespołu biblioteki.
        </p>
        <CopyBorrowContact email={email} message={message} />
      </div>
    </section>
  );
}
