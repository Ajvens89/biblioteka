"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import { createGame, updateGame } from "@/lib/actions/games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";

type GameData = {
  id?: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  minPlayers: number;
  maxPlayers: number;
  minAge: number;
  minPlayTime: number;
  maxPlayTime: number;
  difficulty: string;
  type: string;
  publisherId?: string | null;
  designerId?: string | null;
  yearPublished?: number | null;
  coverImageUrl?: string | null;
  instructionUrl?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  categoryIds?: string[];
  tagIds?: string[];
};

export function GameForm({
  game,
  publishers,
  designers,
  categories,
  tags,
}: {
  game?: GameData;
  publishers: Publisher[];
  designers: Designer[];
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const submit = (formData: FormData) => {
    start(async () => {
      const categoryIds = categories
        .filter((c) => formData.get(`cat_${c.id}`) === "on")
        .map((c) => c.id);
      const tagIds = tags.filter((t) => formData.get(`tag_${t.id}`) === "on").map((t) => t.id);

      const input = {
        title: String(formData.get("title")),
        description: String(formData.get("description") || ""),
        shortDescription: String(formData.get("shortDescription") || ""),
        minPlayers: Number(formData.get("minPlayers")),
        maxPlayers: Number(formData.get("maxPlayers")),
        minAge: Number(formData.get("minAge")),
        minPlayTime: Number(formData.get("minPlayTime")),
        maxPlayTime: Number(formData.get("maxPlayTime")),
        difficulty: String(formData.get("difficulty")) as "EASY" | "MEDIUM" | "HARD" | "EXPERT",
        type: String(formData.get("type")) as "BOARD",
        publisherId: String(formData.get("publisherId") || "") || null,
        designerId: String(formData.get("designerId") || "") || null,
        yearPublished: formData.get("yearPublished")
          ? Number(formData.get("yearPublished"))
          : null,
        coverImageUrl: String(formData.get("coverImageUrl") || ""),
        instructionUrl: String(formData.get("instructionUrl") || ""),
        isActive: formData.get("isActive") === "on",
        isFeatured: formData.get("isFeatured") === "on",
        categoryIds,
        tagIds,
      };

      const result = game?.id
        ? await updateGame(game.id, input)
        : await createGame(input);

      if (result.success) {
        toast.success(game?.id ? "Zapisano grę." : "Utworzono grę.");
        router.push("/admin/gry");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <form action={submit} className="max-w-2xl space-y-4" data-testid="game-form">
      <div className="space-y-2">
        <Label htmlFor="title">Tytuł</Label>
        <Input id="title" name="title" data-testid="game-form-title" defaultValue={game?.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shortDescription">Krótki opis</Label>
        <Input id="shortDescription" name="shortDescription" defaultValue={game?.shortDescription ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          name="description"
          data-testid="game-form-description"
          rows={5}
          defaultValue={game?.description ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minPlayers">Min graczy</Label>
          <Input id="minPlayers" name="minPlayers" type="number" defaultValue={game?.minPlayers ?? 2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPlayers">Max graczy</Label>
          <Input id="maxPlayers" name="maxPlayers" type="number" defaultValue={game?.maxPlayers ?? 4} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minPlayTime">Min czas (min)</Label>
          <Input id="minPlayTime" name="minPlayTime" type="number" defaultValue={game?.minPlayTime ?? 30} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPlayTime">Max czas (min)</Label>
          <Input id="maxPlayTime" name="maxPlayTime" type="number" defaultValue={game?.maxPlayTime ?? 90} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minAge">Wiek</Label>
          <Input id="minAge" name="minAge" type="number" defaultValue={game?.minAge ?? 10} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearPublished">Rok</Label>
          <Input id="yearPublished" name="yearPublished" type="number" defaultValue={game?.yearPublished ?? ""} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Trudność</Label>
          <select id="difficulty" name="difficulty" className="h-10 w-full rounded-md border px-2" defaultValue={game?.difficulty ?? "MEDIUM"}>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Typ</Label>
          <select id="type" name="type" className="h-10 w-full rounded-md border px-2" defaultValue={game?.type ?? "BOARD"}>
            {Object.entries(GAME_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="publisherId">Wydawca</Label>
          <select id="publisherId" name="publisherId" className="h-10 w-full rounded-md border px-2" defaultValue={game?.publisherId ?? ""}>
            <option value="">—</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="designerId">Autor</Label>
          <select id="designerId" name="designerId" className="h-10 w-full rounded-md border px-2" defaultValue={game?.designerId ?? ""}>
            <option value="">—</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="coverImageUrl">URL okładki</Label>
        <Input id="coverImageUrl" name="coverImageUrl" defaultValue={game?.coverImageUrl ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructionUrl">URL instrukcji</Label>
        <Input id="instructionUrl" name="instructionUrl" defaultValue={game?.instructionUrl ?? ""} />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={game?.isActive ?? true} />
          Aktywna
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={game?.isFeatured ?? false} />
          Wyróżniona
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Kategorie</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name={`cat_${c.id}`} defaultChecked={game?.categoryIds?.includes(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Tagi</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <label key={t.id} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name={`tag_${t.id}`} defaultChecked={game?.tagIds?.includes(t.id)} />
              {t.name}
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending} data-testid="game-form-submit">
        {pending ? "Zapisywanie…" : game?.id ? "Zapisz" : "Utwórz grę"}
      </Button>
    </form>
  );
}
