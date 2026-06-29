"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import {
  CATALOG_FILTER_KEYS,
  countActiveFilters,
  readFilterValues,
  type CatalogFilterValues,
  type CatalogOptionLists,
} from "@/lib/games/catalog-filters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { CatalogFilters } from "@/components/catalog/catalog-filters";

type Props = { lists: CatalogOptionLists };

const SHEET_CLASS =
  "left-0 right-0 top-auto bottom-0 w-full max-w-none max-h-[88dvh] translate-x-0 translate-y-0 " +
  "flex flex-col gap-0 p-0 overflow-hidden rounded-t-2xl rounded-b-none border-x-0 border-b-0 sm:rounded-t-2xl sm:rounded-b-none";

export function CatalogMobileFilters({ lists }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogFilterValues>({});
  const [isPending, startTransition] = useTransition();

  const activeCount = countActiveFilters(new URLSearchParams(searchParams.toString()));

  useEffect(() => {
    if (open) {
      setDraft(readFilterValues(new URLSearchParams(searchParams.toString())));
    }
  }, [open, searchParams]);

  const onChange = (patch: Record<string, string | null>) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") delete next[key as keyof CatalogFilterValues];
        else next[key as keyof CatalogFilterValues] = value;
      }
      return next;
    });
  };

  const apply = () => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of CATALOG_FILTER_KEYS) {
      const value = draft[key];
      if (value && value.trim()) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className="lg:hidden"
        data-testid="catalog-filters-mobile"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={activeCount > 0 ? `Otwórz filtry, aktywnych: ${activeCount}` : "Otwórz filtry"}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filtry
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <DialogContent className={SHEET_CLASS} data-testid="catalog-filters-sheet">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <DialogTitle className="text-base">Filtry katalogu</DialogTitle>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <CatalogFilters
            values={draft}
            onChange={onChange}
            lists={lists}
            idPrefix="m-"
            defaultMoreOpen
          />
        </div>

        <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-border bg-background px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setDraft({})}
          >
            Wyczyść
          </Button>
          <Button type="button" className="flex-[1.6]" onClick={apply} loading={isPending}>
            Pokaż wyniki
          </Button>
        </div>

        <DialogClose className="sr-only">Zamknij filtry</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
