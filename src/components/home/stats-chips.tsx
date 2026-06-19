import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarCheck, Dices, Layers } from "lucide-react";
import { pluralPl } from "@/lib/plural-pl";

type Chip = { icon: LucideIcon; text: string; id: string };

type Props = {
  totalGames: number;
  boardCount: number;
  rpgCount: number;
  availableCopies?: number;
};

export function StatsChips({ totalGames, boardCount, rpgCount, availableCopies }: Props) {
  const chips: Chip[] = [
    {
      id: "total",
      icon: Layers,
      text: `${totalGames} ${pluralPl(totalGames, "pozycja", "pozycje", "pozycji")} w katalogu`,
    },
    {
      id: "board",
      icon: Dices,
      text: `${boardCount} ${pluralPl(boardCount, "gra planszowa", "gry planszowe", "gier planszowych")}`,
    },
    {
      id: "rpg",
      icon: BookOpen,
      text: `${rpgCount} ${pluralPl(rpgCount, "podręcznik RPG", "podręczniki RPG", "podręczników RPG")}`,
    },
    {
      id: "available",
      icon: CalendarCheck,
      text:
        availableCopies && availableCopies > 0
          ? `${availableCopies} ${pluralPl(availableCopies, "egzemplarz", "egzemplarze", "egzemplarzy")} do rezerwacji`
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
