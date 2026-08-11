import Link from "next/link";
import { MotionReveal } from "@/components/ui/motion-reveal";

type Props = {
  stats: {
    games: number;
    copies: number;
    available: number;
    boardGames: number;
    rpgGames: number;
  };
};

export function HomePublicStats({ stats }: Props) {
  const items = [
    { label: "Gry planszowe", value: stats.boardGames, href: "/katalog?collectionType=BOARD_GAME" },
    { label: "Gry fabularne", value: stats.rpgGames, href: "/katalog?collectionType=RPG" },
    { label: "Egzemplarzy", value: stats.copies, href: "/katalog" },
    { label: "Dostępnych teraz", value: stats.available, href: "/katalog?availability=available" },
  ];

  return (
    <section className="border-y border-border/80 bg-muted/15 py-10" aria-label="Biblioteka w liczbach">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {items.map(({ label, value, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="block rounded-[var(--radius-card)] border border-border/60 bg-card/50 px-4 py-4 transition-colors hover:border-primary/35 hover:bg-card"
                >
                  <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                    {value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </MotionReveal>
      </div>
    </section>
  );
}
