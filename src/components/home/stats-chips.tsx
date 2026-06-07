import type { LucideIcon } from "lucide-react";
import { CalendarCheck, Dices, Layers } from "lucide-react";

type Chip = { icon: LucideIcon; text: string };

type Props = {
  totalGames: number;
  availableCopies?: number;
};

export function StatsChips({ totalGames, availableCopies }: Props) {
  const chips: Chip[] = [
    { icon: Layers, text: `${totalGames} gier w katalogu` },
    { icon: Dices, text: "Planszówki i podręczniki RPG" },
    {
      icon: CalendarCheck,
      text:
        availableCopies && availableCopies > 0
          ? `${availableCopies} egzemplarzy do rezerwacji`
          : "Rezerwacje online 24/7",
    },
  ];

  return (
    <ul className="flex flex-wrap justify-center gap-2 lg:justify-start" aria-label="Statystyki biblioteki">
      {chips.map(({ icon: Icon, text }) => (
        <li key={text}>
          <span className="zf-stat-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium">
            <Icon className="h-4 w-4 shrink-0 text-[var(--zf-gold)]" aria-hidden />
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}
