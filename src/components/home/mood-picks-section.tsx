import Link from "next/link";
import { MotionReveal, MotionStaggerItem } from "@/components/ui/motion-reveal";

const MOODS = [
  {
    title: "Wieczór we dwoje",
    description: "Gry dla dwóch osób, dostępne od ręki",
    href: "/katalog?mood=duo",
  },
  {
    title: "Mam 30 minut",
    description: "Krótkie partie bez rozstawiania świata",
    href: "/katalog?mood=short",
  },
  {
    title: "Cała rodzina",
    description: "Tytuły rodzinne dla różnych pokoleń",
    href: "/katalog?mood=family",
  },
  {
    title: "Gramy przeciw grze",
    description: "Kooperacja — wygrywacie albo przegrywacie razem",
    href: "/katalog?mood=coop",
  },
  {
    title: "Prowadzę sesję",
    description: "Podręczniki i dodatki do gier fabularnych",
    href: "/katalog?mood=rpg",
  },
] as const;

export function MoodPicksSection() {
  return (
    <section className="py-16 md:py-20" aria-labelledby="mood-picks-heading">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up" className="mb-8 max-w-xl">
          <p className="text-eyebrow">Zacznij od nastroju</p>
          <h2 id="mood-picks-heading" className="text-h2 mt-2 text-foreground">
            Jaki macie dziś wieczór?
          </h2>
        </MotionReveal>

        <MotionReveal variant="stagger-container" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOODS.map((mood, index) => (
            <MotionStaggerItem key={mood.href} index={index}>
              <Link
                href={mood.href}
                className="group block rounded-[var(--radius-card)] border border-border/70 bg-card/70 p-5 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <h3 className="font-display text-lg font-medium text-foreground group-hover:text-primary">
                  {mood.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {mood.description}
                </p>
              </Link>
            </MotionStaggerItem>
          ))}
        </MotionReveal>
      </div>
    </section>
  );
}
