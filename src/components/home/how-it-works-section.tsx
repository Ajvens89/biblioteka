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
    <section className="zf-section-steps py-16 md:py-20" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Proces</p>
          <h2 id="how-it-works-heading" className="font-display text-h2 mt-2 text-foreground">
            Jak to działa?
          </h2>
          <p className="text-body mt-3 text-muted-foreground">
            Pięć prostych kroków — od wyboru tytułu po zwrot egzemplarza. Całość obsługujesz
            online.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="zf-step-card group relative flex flex-col p-6">
              <span className="zf-step-number font-display absolute -top-3 left-5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                {i + 1}
              </span>
              <div className="zf-step-icon mb-5 mt-1 flex h-14 w-14 items-center justify-center rounded-2xl">
                <Icon className="h-7 w-7" strokeWidth={1.65} aria-hidden />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
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
