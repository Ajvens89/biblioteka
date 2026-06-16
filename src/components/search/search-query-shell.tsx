"use client";

import { QueryProvider } from "@/components/query-provider";

/** React Query tylko dla powierzchni wyszukiwania (mniejszy bundle globalny). */
export function SearchQueryShell({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
