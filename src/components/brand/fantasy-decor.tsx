import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "hero" | "subtle";
};

/** Lekka warstwa dekoracyjna — sylwetki fantasy bez obciążania treści. */
export function FantasyDecor({ className, variant = "hero" }: Props) {
  return (
    <div
      className={cn(
        "zf-fantasy-decor pointer-events-none absolute inset-0 overflow-hidden",
        variant === "subtle" && "opacity-60",
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute -right-8 top-8 h-40 w-40 opacity-20"
        style={{
          backgroundImage: "url(/brand/decor-silhouettes.svg)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute -left-12 bottom-0 h-48 w-56 rotate-12 opacity-15"
        style={{
          backgroundImage: "url(/brand/decor-silhouettes.svg)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
