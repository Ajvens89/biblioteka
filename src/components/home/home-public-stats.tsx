import Link from "next/link";
import { MotionReveal } from "@/components/ui/motion-reveal";

type Props = {
  stats: {
    games: number;
    boardGames: number;
    rpgGames: number;
  };
};

export function HomePublicStats({ stats }: Props) {
  const items = [
    { label: "Gry planszowe", value: stats.boardGames, href: "/katalog" },
    { label: "Gry fabularne", value: stats.rpgGames, href: "/katalog" },
  ];

  return (
    <section className="zf-stats-strip" aria-label="Biblioteka w liczbach">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <ul className="grid grid-cols-2 gap-8">
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
