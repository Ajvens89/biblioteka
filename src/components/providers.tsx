"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import type { Theme } from "@/lib/theme";
import { Toaster } from "sonner";

export function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  return (
    <QueryProvider>
      <ThemeProvider initialTheme={initialTheme}>
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryProvider>
  );
}
