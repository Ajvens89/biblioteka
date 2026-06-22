"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, LayoutDashboard, LogIn, Menu, User } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

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

  const accountLinks = user
    ? [
        { href: "/moje-konto", label: "Moje konto", icon: User },
        { href: "/moje-rezerwacje", label: "Rezerwacje", icon: BookOpen },
        ...(user.role === "ADMIN" || user.role === "LIBRARIAN"
          ? [{ href: "/admin", label: "Panel administracyjny", icon: LayoutDashboard }]
          : []),
      ]
    : [{ href: "/login", label: "Zaloguj się", icon: LogIn }];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="lg:hidden"
        aria-label="Otwórz menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-sm">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle className="font-display text-lg">Menu</DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col gap-1 p-3" aria-label="Menu mobilne">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Katalog
            </p>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                {label}
              </Link>
            ))}
            <p className="mt-3 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Konto
            </p>
            {accountLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
