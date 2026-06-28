"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
};

function isNavActive(pathname: string, searchParams: URLSearchParams, href: string): boolean {
  if (href.startsWith("http")) return false;

  const [path, query] = href.split("?");
  if (pathname !== path) return false;

  if (!query) {
    if (path === "/katalog") return !searchParams.get("collectionType");
    if (path === "/moje-konto") return true;
    return pathname === path;
  }

  const target = new URLSearchParams(query);
  for (const [key, value] of target.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

export function SiteNavLink({ href, children, className, external }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = !external && isNavActive(pathname, searchParams, href);

  const classes = cn("site-nav-link", active && "site-nav-link--active", className);

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
