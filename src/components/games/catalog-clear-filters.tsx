"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CatalogClearFilters() {
  const router = useRouter();
  return (
    <Button type="button" variant="outline" onClick={() => router.push("/katalog")}>
      Wyczyść filtry
    </Button>
  );
}
