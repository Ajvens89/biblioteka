import Link from "next/link";
import { ChevronDown, HelpCircle } from "lucide-react";

const faq = [
  {
    q: "Czy trzeba mieć konto?",
    a: "Tak — rezerwacja online wymaga bezpłatnej rejestracji. Przeglądanie katalogu jest dostępne dla wszystkich.",
  },
  {
    q: "Na ile można wypożyczyć?",
    a: "Standardowy okres wypożyczenia wynosi 14 dni (zgodnie z regulaminem biblioteki). Możliwe jest przedłużenie po kontakcie z bibliotekarzem.",
  },
  {
    q: "Czy można zarezerwować RPG?",
    a: "Tak. Gry fabularne (książki, podręczniki) są w katalogu oznaczone jako „Gry fabularne” i rezerwujesz je tak samo jak planszówki.",
  },
  {
    q: "Co jeśli gra jest niedostępna?",
    a: "Możesz sprawdzić katalog później lub zapytać w bibliotece. Status „Dostępna” oznacza wolny egzemplarz do rezerwacji.",
  },
];

export function LandingFaq() {
  return (
    <section className="landing-section-faq py-14 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-sm">
            <HelpCircle className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="font-display text-h2 text-foreground">Najczęstsze pytania</h2>
          <p className="text-body mt-2 text-muted-foreground">
            Odpowiedzi na to, o co pytacie najczęściej.
          </p>
        </div>

        <div className="space-y-3">
          {faq.map(({ q, a }) => (
            <details key={q} className="landing-faq-card group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-base font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="text-body border-t border-border/50 px-5 pb-4 pt-3 leading-relaxed text-muted-foreground">
                {a}
              </p>
            </details>
          ))}
        </div>

        <p className="text-small mt-8 text-center text-muted-foreground">
          Więcej w{" "}
          <Link href="/regulamin" className="font-semibold text-primary underline-offset-2 hover:underline">
            regulaminie
          </Link>{" "}
          i na stronie{" "}
          <Link href="/kontakt" className="font-semibold text-primary underline-offset-2 hover:underline">
            kontakt
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
