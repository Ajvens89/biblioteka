import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://zakatekfantastyki.pl/wp-content/uploads/2025/11/zakatek_fantastyki_logo.jpg";

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
  const height = size === "sm" ? 36 : 44;

  return (
    <Link
      href="/"
      className={cn("group inline-flex min-w-0 items-center gap-3", className)}
      aria-label="Zakątek Fantastyki — Biblioteka gier, strona główna"
    >
      <Image
        src={LOGO_URL}
        alt="Zakątek Fantastyki"
        width={height * 3}
        height={height}
        className="h-9 w-auto shrink-0 object-contain sm:h-11"
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
