import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarCheck, Dices, Layers } from "lucide-react";

type Chip = { icon: LucideIcon; text: string; id: string };

type Props = {
  totalGames: number;
  boardGames: number;
  rpgGames: number;
  availableCopies?: number;
};

function pl(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function StatsChips({ totalGames, boardGames, rpgGames, availableCopies }: Props) {
  const chips: Chip[] = [
    {
      id: "total",
      icon: Layers,
      text: `${totalGames} ${pl(totalGames, "pozycja", "pozycje", "pozycji")} w katalogu`,
    },
    {
      id: "board",
      icon: Dices,
      text: `${boardGames} ${pl(boardGames, "gra planszowa", "gry planszowe", "gier planszowych")}`,
    },
    {
      id: "rpg",
      icon: BookOpen,
      text: `${rpgGames} ${pl(rpgGames, "podręcznik RPG", "podręczniki RPG", "podręczników RPG")}`,
    },
    {
      id: "available",
      icon: CalendarCheck,
      text:
        availableCopies && availableCopies > 0
          ? `${availableCopies} ${pl(availableCopies, "egzemplarz", "egzemplarze", "egzemplarzy")} do rezerwacji`
          : "Rezerwacje online 24/7",
    },
  ];

  return (
    <ul className="flex flex-wrap justify-center gap-2 lg:justify-start" aria-label="Statystyki biblioteki">
      {chips.map(({ id, icon: Icon, text }) => (
        <li key={id}>
          <span className="zf-stat-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium">
            <Icon className="h-4 w-4 shrink-0 text-[var(--zf-gold)]" aria-hidden />
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}
