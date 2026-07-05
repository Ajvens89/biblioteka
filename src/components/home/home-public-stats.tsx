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
    { label: "Gier w katalogu", value: stats.games, href: "/katalog" },
    { label: "Egzemplarzy", value: stats.copies, href: "/katalog" },
    { label: "Dostępnych teraz", value: stats.available, href: "/katalog?availability=available" },
    { label: "Planszówki", value: stats.boardGames, href: "/katalog?collectionType=BOARD_GAME" },
    { label: "RPG", value: stats.rpgGames, href: "/katalog?collectionType=RPG" },
  ];

  return (
    <section className="border-y border-border/80 bg-muted/20 py-10" aria-label="Statystyki biblioteki">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.map(({ label, value, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="block rounded-lg border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-card"
                >
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </MotionReveal>
      </div>
    </section>
  );
}
