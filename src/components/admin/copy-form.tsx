"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { Game } from "@prisma/client";
import { createCopy, updateCopy } from "@/lib/actions/games";
import { COPY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CopyData = {
  id?: string;
  gameId: string;
  inventoryNumber: string;
  barcode?: string | null;
  status: string;
  condition: string;
  location?: string | null;
  notes?: string | null;
};

export function CopyForm({
  copy,
  games,
  defaultGameId,
}: {
  copy?: CopyData;
  games: Pick<Game, "id" | "title">[];
  defaultGameId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      className="max-w-md space-y-4"
      data-testid="copy-form"
      action={(formData) =>
        start(async () => {
          const input = {
            gameId: String(formData.get("gameId")),
            inventoryNumber: String(formData.get("inventoryNumber")),
            barcode: String(formData.get("barcode") || "") || undefined,
            status: String(formData.get("status")) as "AVAILABLE",
            condition: String(formData.get("condition")) as "GOOD",
            location: String(formData.get("location") || "") || undefined,
            notes: String(formData.get("notes") || "") || undefined,
          };
          const result = copy?.id
            ? await updateCopy(copy.id, input)
            : await createCopy(input);
          if (result.success) {
            toast.success("Zapisano egzemplarz.");
            router.refresh();
          } else toast.error(result.error);
        })
      }
    >
      <div className="space-y-2">
        <Label>Gra</Label>
        <select
          name="gameId"
          data-testid="copy-form-game"
          className="h-10 w-full rounded-md border px-2"
          defaultValue={copy?.gameId ?? defaultGameId ?? games[0]?.id}
          required
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Numer inwentarzowy</Label>
        <Input
          name="inventoryNumber"
          data-testid="copy-form-inventory"
          defaultValue={copy?.inventoryNumber}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="copy-barcode">Kod egzemplarza (naklejka / barcode)</Label>
        <Input
          id="copy-barcode"
          name="barcode"
          data-testid="copy-form-barcode"
          defaultValue={copy?.barcode ?? ""}
          placeholder="Wewnętrzny kod pudełka — nie wpisuj EAN z okładki"
        />
        <p className="text-xs text-muted-foreground">
          To nie jest EAN produktu. EAN ustawiasz w formularzu gry, nie tutaj.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <select name="status" className="h-10 w-full rounded-md border px-2" defaultValue={copy?.status ?? "AVAILABLE"}>
          {Object.entries(COPY_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Stan</Label>
        <select name="condition" className="h-10 w-full rounded-md border px-2" defaultValue={copy?.condition ?? "GOOD"}>
          <option value="NEW">Nowy</option>
          <option value="GOOD">Dobry</option>
          <option value="FAIR">Średni</option>
          <option value="POOR">Słaby</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Lokalizacja</Label>
        <Input name="location" defaultValue={copy?.location ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Notatki</Label>
        <Textarea name="notes" defaultValue={copy?.notes ?? ""} />
      </div>
      <Button type="submit" disabled={pending} data-testid="copy-form-submit">
        Zapisz
      </Button>
    </form>
  );
}
