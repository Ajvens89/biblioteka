"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeProvider>{children}</ThemeProvider>
      <Toaster richColors position="top-right" />
    </>
  );
}
