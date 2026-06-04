import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "narrow" | "wide";
};

const widths = {
  default: "max-w-7xl",
  narrow: "max-w-3xl",
  wide: "max-w-[90rem]",
};

export function PageShell({ children, className, width = "default" }: Props) {
  return (
    <div className={cn("mx-auto w-full px-4 py-8 md:py-10", widths[width], className)}>
      {children}
    </div>
  );
}
