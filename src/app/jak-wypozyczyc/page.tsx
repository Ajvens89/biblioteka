import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Mail, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Jak wypożyczyć",
  description:
    "Cztery proste kroki: znajdź grę w katalogu, napisz do fundacji, odbierz w Bielsku-Białej i graj za darmo.",
};

const STEPS = [
  {
    icon: Search,
    title: "Znajdź tytuł",
    text: "Przejrzyj katalog — filtruj po liczbie graczy, czasie, wieku albo zeskanuj kod EAN z pudełka.",
  },
  {
    icon: BookOpen,
    title: "Sprawdź dostępność",
    text: "Na karcie gry zobaczysz, ile egzemplarzy jest wolnych. Status w systemie to wskazówka — potwierdzimy go mailem.",
  },
  {
    icon: Mail,
    title: "Napisz do fundacji",
    text: `Z karty gry wyślesz gotową wiadomość na ${FOUNDATION_LOAN_EMAIL}. Podaj tytuł i kiedy możesz odebrać grę.`,
  },
  {
    icon: MapPin,
    title: "Odbierz i graj",
    text: "Odbiór osobisty w siedzibie Zakątka: Partyzantów 44, 43-300 Bielsko-Biała. Wypożyczenie jest bezpłatne.",
  },
] as const;

const FAQ = [
  {
    q: "Czy trzeba zakładać konto?",
    a: "Nie. Katalog jest otwarty bez rejestracji. Logowanie jest tylko dla zespołu biblioteki.",
  },
  {
    q: "Ile kosztuje wypożyczenie?",
    a: "0 zł. Biblioteka jest działaniem Fundacji Zakątek Fantastyki.",
  },
  {
    q: "Czy mogę wypożyczyć kilka gier naraz?",
    a: "Napisz w mailu, ile tytułów Cię interesuje — ustalamy to indywidualnie.",
  },
] as const;

export default function HowToBorrowPage() {
  return (
    <PageShell className="py-10 md:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-eyebrow">Wypożyczenie</p>
        <h1 className="text-h1 mt-3 text-foreground">Jak wypożyczyć grę?</h1>
        <p className="text-body mx-auto mt-4 max-w-2xl text-muted-foreground">
          Bez konta, bez płatności online. Wybierasz tytuł w katalogu, piszesz do fundacji i
          odbierasz pudełko w Bielsku-Białej.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/katalog">
              Otwórz katalog
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={`mailto:${FOUNDATION_LOAN_EMAIL}`}>Napisz: {FOUNDATION_LOAN_EMAIL}</a>
          </Button>
        </div>
      </header>

      <ol className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className="rounded-[var(--radius-card)] border border-border/70 bg-card/60 p-6"
          >
            <span className="text-eyebrow text-primary">{String(index + 1).padStart(2, "0")}</span>
            <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-md border border-border/80 bg-surface-elevated">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="mt-4 font-display text-xl font-medium text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>

      <section className="mx-auto mt-16 max-w-2xl" aria-labelledby="howto-faq-heading">
        <h2 id="howto-faq-heading" className="text-h2 text-center text-foreground">
          Częste pytania
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ q, a }) => (
            <article
              key={q}
              className="rounded-[var(--radius-card)] border border-border/70 bg-card/50 px-5 py-4"
            >
              <h3 className="font-display text-base font-medium text-foreground">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
