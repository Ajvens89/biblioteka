"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookCopy,
  CalendarCheck,
  ClipboardList,
  Copy,
  FileSpreadsheet,
  Gamepad2,
  LayoutDashboard,
  ScanLine,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/gry", label: "Gry", icon: Gamepad2 },
  { href: "/admin/jakosc-danych", label: "Jakość danych", icon: Copy },
  { href: "/admin/duplikaty", label: "Duplikaty", icon: Copy },
  { href: "/admin/egzemplarze", label: "Egzemplarze", icon: BookCopy },
  { href: "/admin/obsluga", label: "Obsługa skanem", icon: ScanLine },
  { href: "/admin/rezerwacje", label: "Rezerwacje", icon: CalendarCheck },
  { href: "/admin/wypozyczenia", label: "Wypożyczenia", icon: ClipboardList },
  { href: "/admin/prosby-przedluzenia", label: "Przedłużenia", icon: CalendarCheck },
  { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users },
  { href: "/admin/statystyki", label: "Statystyki", icon: BarChart3 },
  { href: "/admin/raporty", label: "Raporty", icon: FileSpreadsheet },
  { href: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
  { href: "/admin/logi", label: "Logi", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card md:block">
      <nav className="flex flex-col gap-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href || (href !== "/admin" && pathname.startsWith(href))
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
