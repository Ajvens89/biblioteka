"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Dices,
  LayoutDashboard,
  LogIn,
  Menu,
  Scroll,
  User,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ICONS: Record<string, LucideIcon> = {
  catalog: BookOpen,
  board: Dices,
  rpg: Scroll,
  account: User,
  admin: LayoutDashboard,
  login: LogIn,
};

type NavLink = { href: string; label: string; icon?: keyof typeof ICONS };

type SessionUser = {
  email: string;
  fullName: string | null;
  role: UserRole;
};

type Props = {
  links: NavLink[];
  user: SessionUser | null;
};

export function MobileNav({ links, user }: Props) {
  const [open, setOpen] = useState(false);

  const accountLinks: NavLink[] = user
    ? [
        { href: "/moje-konto", label: "Moje konto", icon: "account" },
        { href: "/moje-rezerwacje", label: "Rezerwacje", icon: "catalog" },
        ...(user.role === "ADMIN" || user.role === "LIBRARIAN"
          ? [{ href: "/admin", label: "Panel administracyjny", icon: "admin" as const }]
          : []),
      ]
    : [{ href: "/login", label: "Zaloguj się", icon: "login" }];

  function renderLink({ href, label, icon }: NavLink) {
    const Icon = icon ? ICONS[icon] : null;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className="mobile-nav-link flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium"
      >
        {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden />}
        {label}
      </Link>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="lg:hidden"
        aria-label="Otwórz menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mobile-nav-panel max-h-[90dvh] overflow-y-auto p-0 sm:max-w-sm">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle className="font-display text-lg">Menu</DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col gap-1 p-3" aria-label="Menu mobilne">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Katalog
            </p>
            {links.map(renderLink)}
            <p className="mt-3 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Konto
            </p>
            {accountLinks.map(renderLink)}
            <a
              href="https://zakatekfantastyki.pl/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mobile-nav-link flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium"
            >
              Strona Fundacji
            </a>
            {user && (
              <form action={logoutAction} className="px-3 pt-2">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  data-testid="logout-button"
                  onClick={() => setOpen(false)}
                >
                  Wyloguj
                </Button>
              </form>
            )}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
