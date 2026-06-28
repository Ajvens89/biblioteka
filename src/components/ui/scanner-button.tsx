"use client";

import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  label?: string;
  className?: string;
  testId?: string;
  variant?: "default" | "outline" | "secondary";
  prominent?: boolean;
};

export function ScannerButton({
  onClick,
  label = "Skanuj EAN",
  className,
  testId = "ean-scan-button",
  variant = "outline",
  prominent = false,
}: Props) {
  if (prominent) {
    return (
      <Button
        type="button"
        onClick={onClick}
        className={cn(
          "gap-2 border-2 border-accent/40 bg-accent/15 font-semibold text-accent-foreground shadow-sm",
          "hover:bg-accent/25 hover:border-accent/60",
          "h-12 min-h-12 rounded-md px-4",
          className,
        )}
        data-testid={testId}
        aria-label={label}
      >
        <Camera className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Skanuj</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      className={cn("gap-2", className)}
      data-testid={testId}
      aria-label={label}
    >
      <ScanLine className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
