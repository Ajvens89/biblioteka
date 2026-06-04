"use client";

import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  label?: string;
  className?: string;
  testId?: string;
  variant?: "default" | "outline" | "secondary";
};

export function ScannerButton({
  onClick,
  label = "Skanuj EAN",
  className,
  testId = "ean-scan-button",
  variant = "outline",
}: Props) {
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
