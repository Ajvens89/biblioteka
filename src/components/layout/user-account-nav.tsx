import Link from "next/link";
import { cn } from "@/lib/utils";

export type AccountNavItem = {
  id: string;
  label: string;
  href: string;
};

type Props = {
  items: AccountNavItem[];
  activeId: string;
  className?: string;
};

export function UserAccountNav({ items, activeId, className }: Props) {
  return (
    <nav
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Sekcje konta użytkownika"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="account-nav-link"
          aria-current={activeId === item.id ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
