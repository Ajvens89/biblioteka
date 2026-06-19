"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import type { GameFilterInput } from "@/lib/validations/game";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatalogSidebarFilters } from "@/components/games/catalog-sidebar-filters";

type Props = {
  categories: Category[];
  tags: Tag[];
  publishers: Publisher[];
  designers: Designer[];
  current: GameFilterInput;
};

export function CatalogMobileFilters(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="lg:hidden"
        data-testid="catalog-filters-mobile"
        onClick={() => setOpen(true)}
        aria-label="Otwórz filtry katalogu"
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtry
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtry katalogu</DialogTitle>
          </DialogHeader>
          <CatalogSidebarFilters {...props} idPrefix="m-" />
          <Button type="button" className="w-full" onClick={() => setOpen(false)}>
            Zastosuj
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
