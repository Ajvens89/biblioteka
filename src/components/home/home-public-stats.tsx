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
    <section className="zf-stats-strip" aria-label="Biblioteka w liczbach">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <ul className="zf-stats-row">
            {items.map(({ label, value, href }) => (
              <li key={label} className="zf-stats-item">
                <Link href={href} className="zf-stats-link">
                  <span className="zf-stats-value">{value}</span>
                  <span className="zf-stats-label">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </MotionReveal>
      </div>
    </section>
  );
}
