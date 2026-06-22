import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Lokalna kopia logo Fundacji — fallback bez zależności od WordPressa. */
const LOGO_SRC = "/brand/logo.jpg";

type Props = {
  className?: string;
  subtitle?: string;
  showSubtitle?: boolean;
  size?: "sm" | "md";
};

export function BrandLogo({
  className,
  subtitle = "Biblioteka gier",
  showSubtitle = true,
  size = "md",
}: Props) {
  const imageClass = size === "sm" ? "h-9 sm:h-10" : "h-10 sm:h-11";

  return (
    <Link
      href="/"
      className={cn("group inline-flex min-w-0 items-center gap-3", className)}
      aria-label="Zakątek Fantastyki — Biblioteka gier, strona główna"
    >
      <Image
        src={LOGO_SRC}
        alt="Zakątek Fantastyki"
        width={160}
        height={48}
        className={cn("w-auto shrink-0 object-contain", imageClass)}
        priority
      />
      {showSubtitle && (
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--zf-green-500)]">
            {subtitle}
          </span>
        </span>
      )}
    </Link>
  );
}
