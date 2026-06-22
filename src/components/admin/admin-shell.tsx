"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookCopy,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileUp,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  Timer,
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

const navGroups = [
  {
    label: "Przegląd",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/statystyki", label: "Statystyki", icon: BarChart3 },
      { href: "/admin/raporty", label: "Raporty", icon: ScrollText },
    ],
  },
  {
    label: "Katalog",
    links: [
      { href: "/admin/gry", label: "Gry", icon: Gamepad2 },
      { href: "/admin/egzemplarze", label: "Egzemplarze", icon: BookCopy },
      { href: "/admin/import", label: "Import", icon: FileUp },
      { href: "/admin/jakosc-danych", label: "Jakość danych", icon: ShieldCheck },
      { href: "/admin/duplikaty", label: "Duplikaty", icon: BookCopy },
    ],
  },
  {
    label: "Obsługa",
    links: [
      { href: "/admin/obsluga", label: "Skaner", icon: ScanLine },
      { href: "/admin/rezerwacje", label: "Rezerwacje", icon: CalendarCheck },
      { href: "/admin/wypozyczenia", label: "Wypożyczenia", icon: ClipboardList },
      { href: "/admin/prosby-przedluzenia", label: "Przedłużenia", icon: Timer },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users },
      { href: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
      { href: "/admin/logi", label: "Logi", icon: ScrollText },
    ],
  },
];

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4 p-2">
      {navGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-1 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            {group.links.map(({ href, label, icon: Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname === href || (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex min-h-[40px] items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-secondary",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

type Props = {
  children: React.ReactNode;
  userLabel: string;
};

export function AdminShell({ children, userLabel }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin-sidebar-collapsed") === "1";
  });

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("admin-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div data-admin-panel className="flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.25rem]" : "w-64",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-4">
          {!collapsed && (
            <div className="min-w-0 px-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Panel
              </p>
              <p className="truncate text-sm font-medium text-primary">{APP_NAME}</p>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            onClick={toggleCollapsed}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-3">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            ← {!collapsed && "Strona publiczna"}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:h-16 md:px-6">
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
            <span className="font-display text-base font-medium md:text-lg">
              Panel biblioteczny
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden max-w-[12rem] truncate text-muted-foreground sm:inline">
              {userLabel}
            </span>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit" data-testid="logout-button">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Wyloguj</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-xs">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Menu panelu</DialogTitle>
          </DialogHeader>
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
