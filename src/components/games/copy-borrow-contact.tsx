"use client";

import { useId, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { email: string; message: string };

export function CopyBorrowContact({ email, message }: Props) {
  const [feedback, setFeedback] = useState("");
  const [manualValue, setManualValue] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const manualId = useId();

  async function copy(value: string, success: string) {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(value);
      setManualValue(null);
      setFeedback(success);
    } catch {
      setManualValue(value);
      setFeedback("Zaznacz tekst w polu poniżej i skopiuj go ręcznie.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <p className="text-sm text-muted-foreground">
        Nie korzystasz z aplikacji pocztowej? Skopiuj adres lub gotowe zapytanie do swojej poczty.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={copying} onClick={() => copy(email, "Adres e-mail skopiowany.")}>
          <Copy className="h-4 w-4" aria-hidden />
          Kopiuj adres e-mail
        </Button>
        <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={copying} onClick={() => copy(message, "Treść zapytania skopiowana.")}>
          <Copy className="h-4 w-4" aria-hidden />
          Kopiuj treść zapytania
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{feedback}</p>
      {manualValue !== null ? (
        <div className="space-y-2">
          <label htmlFor={manualId} className="text-sm font-medium">Tekst do skopiowania</label>
          <textarea
            id={manualId}
            readOnly
            value={manualValue}
            rows={manualValue === email ? 2 : 9}
            onFocus={(event) => event.currentTarget.select()}
            className="block w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ) : null}
    </div>
  );
}
