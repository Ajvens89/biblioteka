import type { LucideIcon } from "lucide-react";
import { BookOpen, Dices, Layers, MapPin, RotateCcw } from "lucide-react";

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const steps: Step[] = [
  {
    icon: BookOpen,
    title: "Wybierz grę",
    text: "Przeglądaj katalog planszówek i podręczników RPG z okładkami i opisami.",
  },
  {
    icon: Layers,
    title: "Zarezerwuj",
    text: "Zaloguj się i zarezerwuj wolny egzemplarz w kilka kliknięć.",
  },
  {
    icon: MapPin,
    title: "Odbierz",
    text: "Odbierz grę w siedzibie Fundacji Zakątek Fantastyki.",
  },
  {
    icon: Dices,
    title: "Graj",
    text: "Zbierz ekipę i ruszaj w przygodę przy stole.",
  },
  {
    icon: RotateCcw,
    title: "Zwróć",
    text: "Oddaj grę na czas — kolejna osoba też zagra.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="zf-section-steps py-16 md:py-24" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 max-w-xl border-b border-border pb-8">
          <p className="text-eyebrow">Proces wypożyczenia</p>
          <h2 id="how-it-works-heading" className="text-h2 mt-2 text-foreground">
            Jak to działa
          </h2>
          <p className="text-body mt-3 text-muted-foreground">
            Pięć kroków od wyboru tytułu do zwrotu egzemplarza — całość online.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="zf-step-card flex flex-col p-5">
              <span className="text-eyebrow mb-3 text-muted-foreground">Krok {i + 1}</span>
              <div className="zf-step-icon mb-4 flex h-11 w-11 items-center justify-center">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="font-display text-base font-medium text-foreground">{title}</h3>
              <p className="text-small mt-2 leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Użyj HowItWorksSection */
export const LandingHowItWorks = HowItWorksSection;
