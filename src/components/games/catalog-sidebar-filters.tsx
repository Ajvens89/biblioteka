"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import { DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";
import type { GameFilterInput } from "@/lib/validations/game";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

type Props = {
  categories: Category[];
  tags: Tag[];
  publishers: Publisher[];
  designers: Designer[];
  current: GameFilterInput;
  idPrefix?: string;
};

export function CatalogSidebarFilters({
  categories,
  tags,
  publishers,
  designers,
  current,
  idPrefix = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/katalog?${params.toString()}`);
  };

  return (
    <div className="space-y-5" data-testid="catalog-sidebar-filters">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Gracze i czas</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${idPrefix}minPlayers`} className="text-xs text-muted-foreground">
              Min graczy
            </Label>
            <input
              id={`${idPrefix}minPlayers`}
              type="number"
              min={1}
              className={selectClass}
              defaultValue={current.minPlayers ?? ""}
              onBlur={(e) => update("minPlayers", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}maxPlayers`} className="text-xs text-muted-foreground">
              Max graczy
            </Label>
            <input
              id={`${idPrefix}maxPlayers`}
              type="number"
              min={1}
              className={selectClass}
              defaultValue={current.maxPlayers ?? ""}
              onBlur={(e) => update("maxPlayers", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor={`${idPrefix}maxPlayTime`} className="text-xs text-muted-foreground">
              Max czas (min)
            </Label>
            <input
              id={`${idPrefix}maxPlayTime`}
              type="number"
              min={0}
              className={selectClass}
              defaultValue={current.maxPlayTime ?? ""}
              onBlur={(e) => update("maxPlayTime", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor={`${idPrefix}minAge`} className="text-xs text-muted-foreground">
              Maks. wiek (od)
            </Label>
            <input
              id={`${idPrefix}minAge`}
              type="number"
              min={0}
              className={selectClass}
              defaultValue={current.minAge ?? ""}
              onBlur={(e) => update("minAge", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}category`}>Kategoria</Label>
        <select
          id={`${idPrefix}category`}
          className={selectClass}
          value={current.category ?? ""}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">Wszystkie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}tag`}>Tag</Label>
        <select
          id={`${idPrefix}tag`}
          className={selectClass}
          value={current.tag ?? ""}
          onChange={(e) => update("tag", e.target.value)}
        >
          <option value="">Wszystkie</option>
          {tags.map((t) => (
            <option key={t.id} value={t.slug}>{t.name}</option>
          ))}
        </select>
      </div>

      {publishers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}publisher`}>Wydawca</Label>
          <select
            id={`${idPrefix}publisher`}
            className={selectClass}
            value={current.publisher ?? ""}
            onChange={(e) => update("publisher", e.target.value)}
          >
            <option value="">Wszyscy</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {designers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}designer`}>Autor</Label>
          <select
            id={`${idPrefix}designer`}
            className={selectClass}
            value={current.designer ?? ""}
            onChange={(e) => update("designer", e.target.value)}
          >
            <option value="">Wszyscy</option>
            {designers.map((d) => (
              <option key={d.id} value={d.slug}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}type`}>Typ gry planszowej</Label>
        <select
          id={`${idPrefix}type`}
          className={selectClass}
          value={current.type ?? ""}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">Wszystkie</option>
          {Object.entries(GAME_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}difficulty`}>Trudność</Label>
        <select
          id={`${idPrefix}difficulty`}
          className={selectClass}
          value={current.difficulty ?? ""}
          onChange={(e) => update("difficulty", e.target.value)}
        >
          <option value="">Wszystkie</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
