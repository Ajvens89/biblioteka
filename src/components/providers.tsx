"use client";

import { Toaster } from "sonner";

// Motyw zablokowany na ciemny — klasa `dark` jest ustawiana na <html> w layout.tsx
// (brak FOUC, brak przełącznika). Infrastruktura motywu (theme-provider.tsx, lib/theme.ts)
// pozostaje w repo na potrzeby przyszłego włączenia trybu jasnego.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
