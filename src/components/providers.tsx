"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        position="top-right"
        offset={{ top: 16, right: 16 }}
        mobileOffset={{ top: 12, right: 12, left: 12 }}
        toastOptions={{
          classNames: {
            toast: "zf-toast",
          },
        }}
      />
    </>
  );
}
