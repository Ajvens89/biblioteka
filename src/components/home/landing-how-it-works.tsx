import type { LucideIcon } from "lucide-react";
import { BookOpen, Dices, Layers, MapPin, RotateCcw } from "lucide-react";

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
  accent: string;
};

const steps: Step[] = [
  {
    icon: BookOpen,
    title: "Wybierz",
    text: "Przeglądaj katalog planszówek i RPG.",
    accent: "landing-step--violet",
  },
  {
    icon: Layers,
    title: "Zarezerwuj",
    text: "Zaloguj się i zarezerwuj wolny egzemplarz.",
    accent: "landing-step--amber",
  },
  {
    icon: MapPin,
    title: "Odbierz",
    text: "Odbierz grę w siedzibie Fundacji.",
    accent: "landing-step--emerald",
  },
  {
    icon: Dices,
    title: "Graj",
    text: "Ciesz się sesją z przyjaciółmi.",
    accent: "landing-step--orange",
  },
  {
    icon: RotateCcw,
    title: "Zwróć",
    text: "Oddaj grę w terminie dla innych.",
    accent: "landing-step--rose",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="landing-section-steps py-14 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Prosty proces
          </p>
          <h2 className="font-display text-h2 mt-2 text-foreground">Jak to działa?</h2>
          <p className="text-body mx-auto mt-2 max-w-lg text-muted-foreground">
            Pięć kroków — jak ruch po planszy. Od wyboru gry do zwrotu egzemplarza.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ icon: Icon, title, text, accent }, i) => (
            <article
              key={title}
              className={`landing-step-card ${accent} group relative flex flex-col p-5 text-center`}
            >
              <span className="landing-step-number font-display absolute -top-3 left-4 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-md">
                {i + 1}
              </span>
              <div className="landing-step-icon mx-auto mb-4 mt-2 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl shadow-inner">
                <Icon className="h-9 w-9" strokeWidth={1.65} aria-hidden />
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
