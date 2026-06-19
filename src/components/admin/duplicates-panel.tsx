"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mergeGamesAction } from "@/lib/actions/catalog-quality";
import type { DuplicateCandidate } from "@/lib/services/duplicate-detection";

type Props = { candidates: DuplicateCandidate[] };

export function DuplicatesPanel({ candidates }: Props) {
  const [pending, startTransition] = useTransition();

  function merge(primaryId: string, secondaryId: string) {
    if (!confirm("Scalić rekordy? Operacja jest nieodwracalna.")) return;
    startTransition(async () => {
      const result = await mergeGamesAction(primaryId, secondaryId);
      if (!result.success) toast.error(result.error);
      else toast.success("Gry scalone.");
    });
  }

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Nie wykryto duplikatów.</CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {candidates.slice(0, 50).map((c) => (
        <li key={`${c.gameA.id}-${c.gameB.id}`}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{c.reason} (score: {c.score.toFixed(2)})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded border p-3">
                <Link href={`/admin/gry/${c.gameA.id}`} className="font-medium text-primary hover:underline">
                  {c.gameA.title}
                </Link>
                <p className="text-xs text-muted-foreground">/{c.gameA.slug} · EAN: {c.gameA.ean ?? "—"}</p>
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={pending}
                  onClick={() => merge(c.gameA.id, c.gameB.id)}
                >
                  Zachowaj tę (główna)
                </Button>
              </div>
              <div className="rounded border p-3">
                <Link href={`/admin/gry/${c.gameB.id}`} className="font-medium text-primary hover:underline">
                  {c.gameB.title}
                </Link>
                <p className="text-xs text-muted-foreground">/{c.gameB.slug} · EAN: {c.gameB.ean ?? "—"}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={pending}
                  onClick={() => merge(c.gameB.id, c.gameA.id)}
                >
                  Zachowaj tę (główna)
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
