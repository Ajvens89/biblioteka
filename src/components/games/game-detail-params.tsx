import type { LucideIcon } from "lucide-react";
import { Calendar, Clock, Crown, Layers, Users } from "lucide-react";
import { DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";
import type { Difficulty, GameType } from "@prisma/client";

export type GameDetailParam = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type GameData = {
  isBoard: boolean;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  minAge: number;
  yearPublished: number | null;
  difficulty: Difficulty;
  type: GameType;
};

export function buildGameDetailParams(game: GameData): GameDetailParam[] {
  const params: GameDetailParam[] = [];

  if (game.isBoard && game.maxPlayers > 0) {
    const players =
      game.minPlayers && game.minPlayers !== game.maxPlayers
        ? `${game.minPlayers}–${game.maxPlayers}`
        : `${game.maxPlayers}`;
    params.push({ icon: Users, label: "Gracze", value: players });
  }

  if (game.isBoard && game.maxPlayTime > 0) {
    const time =
      game.minPlayTime && game.minPlayTime !== game.maxPlayTime
        ? `${game.minPlayTime}–${game.maxPlayTime} min`
        : `do ${game.maxPlayTime} min`;
    params.push({ icon: Clock, label: "Czas", value: time });
  }

  if (game.minAge > 0) {
    params.push({ icon: Layers, label: "Wiek", value: `${game.minAge}+` });
  }

  if (game.yearPublished) {
    params.push({ icon: Calendar, label: "Rok", value: String(game.yearPublished) });
  }

  if (game.isBoard) {
    params.push({
      icon: Crown,
      label: "Trudność",
      value: DIFFICULTY_LABELS[game.difficulty],
    });
    params.push({
      icon: Layers,
      label: "Rodzaj",
      value: GAME_TYPE_LABELS[game.type],
    });
  }

  return params;
}

export function GameDetailParams({ params }: { params: GameDetailParam[] }) {
  if (params.length === 0) return null;

  return (
    <dl className="zf-game-params" data-testid="game-params">
      {params.map(({ icon: Icon, label, value }) => (
        <div key={label} className="zf-game-param">
          <dt className="zf-game-param-label">
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {label}
          </dt>
          <dd className="zf-game-param-value">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
