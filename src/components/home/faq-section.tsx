"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { cn } from "@/lib/utils";

const faq = [
  {
    q: "Czy trzeba mieć konto?",
    a: "Tak — rezerwacja online wymaga bezpłatnej rejestracji. Przeglądanie katalogu jest dostępne dla wszystkich.",
  },
  {
    q: "Na ile można wypożyczyć grę?",
    a: "Standardowy okres wypożyczenia wynosi 14 dni (zgodnie z regulaminem biblioteki). Możliwe jest przedłużenie po kontakcie z bibliotekarzem.",
  },
  {
    q: "Czy można zarezerwować podręcznik RPG?",
    a: "Tak. Gry fabularne są w katalogu oznaczone jako „Gry fabularne” i rezerwujesz je tak samo jak planszówki.",
  },
  {
    q: "Co jeśli gra jest niedostępna?",
    a: "Sprawdź katalog później lub skontaktuj się z biblioteką. Status „Dostępna” oznacza wolny egzemplarz do rezerwacji.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <article className="zf-faq-item">
      <button
        type="button"
        className="zf-faq-trigger flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-base font-medium text-foreground"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {q}
        <ChevronDown
          className={cn("zf-faq-chevron h-4 w-4 shrink-0 text-muted-foreground", open && "zf-faq-chevron--open")}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        className={cn("zf-faq-panel", open && "zf-faq-panel--open")}
        role="region"
        aria-hidden={!open}
      >
        <p className="text-body px-5 pb-4 leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </article>
  );
}

export function FAQSection() {
  return (
    <section className="zf-section-faq py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-2xl px-4">
        <MotionReveal variant="fade-up" className="mb-10 text-center">
          <p className="text-eyebrow">Pomoc</p>
          <h2 id="faq-heading" className="text-h2 mt-2 text-foreground">
            Najczęstsze pytania
          </h2>
        </MotionReveal>

        <MotionReveal variant="fade-up" delay={80}>
          <div className="space-y-2">
            {faq.map(({ q, a }) => (
              <FAQItem key={q} q={q} a={a} />
            ))}
          </div>
        </MotionReveal>

        <p className="text-small mt-10 text-center text-muted-foreground">
          Więcej w{" "}
          <Link href="/regulamin" className="font-medium text-primary underline-offset-2 hover:underline">
            regulaminie
          </Link>{" "}
          i na stronie{" "}
          <Link href="/kontakt" className="font-medium text-primary underline-offset-2 hover:underline">
            kontakt
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
