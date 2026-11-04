"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeCatalogUrlParams } from "@/lib/games/catalog-query";

export function useCatalogSearchParams(): URLSearchParams {
  const raw = useSearchParams();
  return useMemo(() => normalizeCatalogUrlParams(raw), [raw]);
}
