"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitGameRatingAction } from "@/lib/actions/ratings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  gameId: string;
  isLoggedIn: boolean;
  loginHref: string;
  initialRating?: number;
  initialComment?: string;
  summary: { average: number; count: number };
};

export function GameRatingForm({
  gameId,
  isLoggedIn,
  loginHref,
  initialRating,
  initialComment,
  summary,
}: Props) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [comment, setComment] = useState(initialComment ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <p className="text-body text-muted-foreground">
        <a href={loginHref} className="font-semibold text-primary underline-offset-2 hover:underline">
          Zaloguj się
        </a>
        , aby ocenić grę.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {summary.count > 0 && (
        <p className="text-small text-muted-foreground">
          Średnia ocena: <strong>{summary.average.toFixed(1)}</strong>/5 ({summary.count}{" "}
          {summary.count === 1 ? "ocena" : "ocen"})
        </p>
      )}
      <div className="space-y-2">
        <Label>Twoja ocena</Label>
        <div className="flex gap-1" role="group" aria-label="Ocena od 1 do 5 gwiazdek">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={cn(
                "rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                rating >= n ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setRating(n)}
              aria-label={`${n} ${n === 1 ? "gwiazdka" : "gwiazdki"}`}
              aria-pressed={rating === n}
            >
              <Star className={cn("h-6 w-6", rating >= n && "fill-primary")} />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`rating-comment-${gameId}`}>Komentarz (opcjonalnie)</Label>
        <textarea
          id={`rating-comment-${gameId}`}
          className="min-h-[4rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="Krótka opinia…"
        />
      </div>
      <Button
        type="button"
        disabled={pending || rating < 1}
        onClick={() =>
          start(async () => {
            const result = await submitGameRatingAction(gameId, rating, comment);
            if (result.success) {
              toast.success(result.message ?? "Ocena zapisana.");
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        Zapisz ocenę
      </Button>
    </div>
  );
}
