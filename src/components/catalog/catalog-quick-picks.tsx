"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Crown, PartyPopper, Scroll, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickPick = {
  label: string;
  icon: typeof Sparkles;
  /** Parametry URL ustawiane przez skrót — to ZWYKŁE parametry filtrów. */
  params: Record<string, string>;
};

const QUICK_PICKS: QuickPick[] = [
  { label: "Dostępne teraz", icon: CheckCircle2, params: { availability: "available" } },
  { label: "Dla 2 osób", icon: Users, params: { minPlayers: "2", maxPlayers: "2" } },
  { label: "Do 30 minut", icon: Clock, params: { maxPlayTime: "30" } },
  { label: "Strategiczne", icon: Crown, params: { category: "strategia" } },
  { label: "Imprezowe", icon: PartyPopper, params: { category: "imprezowe" } },
  { label: "Kooperacyjne", icon: Sparkles, params: { category: "kooperacja" } },
  { label: "RPG", icon: Scroll, params: { collectionType: "RPG" } },
];

export function CatalogQuickPicks() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const isActive = (pick: QuickPick) =>
    Object.entries(pick.params).every(([key, value]) => searchParams.get(key) === value);

  const toggle = (pick: QuickPick) => {
    const params = new URLSearchParams(searchParams.toString());
    const active = isActive(pick);
    if (active) {
      Object.keys(pick.params).forEach((key) => params.delete(key));
    } else {
      Object.entries(pick.params).forEach(([key, value]) => params.set(key, value));
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
    });
  };

  return (
    <div className="zf-quick-picks" role="group" aria-label="Szybkie wybory" data-testid="catalog-quick-picks">
      {QUICK_PICKS.map((pick) => {
        const active = isActive(pick);
        const Icon = pick.icon;
        return (
          <button
            key={pick.label}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(pick)}
            className={cn(
              "zf-quick-pick",
              active ? "zf-quick-pick--active" : "zf-quick-pick--idle",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {pick.label}
          </button>
        );
      })}
    </div>
  );
}
