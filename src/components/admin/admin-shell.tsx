"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookCopy,
  CalendarCheck,
  ClipboardList,
  FileUp,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/gry", label: "Gry", icon: Gamepad2 },
  { href: "/admin/egzemplarze", label: "Egzemplarze", icon: BookCopy },
  { href: "/admin/rezerwacje", label: "Rezerwacje", icon: CalendarCheck },
  { href: "/admin/wypozyczenia", label: "Wypożyczenia", icon: ClipboardList },
  { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users },
  { href: "/admin/import", label: "Import / audyt", icon: FileUp },
  { href: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
  { href: "/admin/logi", label: "Logi", icon: ScrollText },
  { href: "/admin/statystyki", label: "Statystyki", icon: BarChart3 },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || (href !== "/admin" && pathname.startsWith(href));
        return (
          <Link
            key={`${href}-${label}`}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/80 hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

type Props = {
  children: React.ReactNode;
  userLabel: string;
};

export function AdminShell({ children, userLabel }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full max-w-[100vw] overflow-x-hidden">
      <aside className="hidden w-60 shrink-0 border-r border-border/80 bg-card md:flex md:flex-col">
        <div className="border-b border-border/80 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Panel
          </p>
          <p className="text-small mt-1 font-semibold text-primary">{APP_NAME}</p>
        </div>
        <NavLinks />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-4 backdrop-blur md:h-16 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Otwórz menu panelu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-h3 font-semibold">Panel administracyjny</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden max-w-[12rem] truncate text-muted-foreground sm:inline">
              {userLabel}
            </span>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit" data-testid="logout-button">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Wyloguj</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-xs">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Menu panelu</DialogTitle>
          </DialogHeader>
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
