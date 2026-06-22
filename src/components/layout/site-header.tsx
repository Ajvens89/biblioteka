import Link from "next/link";
import {
  BookOpen,
  Dices,
  LayoutDashboard,
  LogIn,
  LogOut,
  Scroll,
  User,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { getNotifications, getUnreadNotificationCount } from "@/lib/actions/notifications";
import { getSessionUser, isStaff } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderSearch } from "@/components/layout/header-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";

export async function SiteHeader() {
  const user = await getSessionUser();
  const unreadCount = user ? await getUnreadNotificationCount() : 0;
  const notifications = user ? (await getNotifications(1)).items : [];

  const navLinks = [
    { href: "/katalog", label: "Katalog", icon: BookOpen },
    { href: "/katalog?collectionType=BOARD_GAME", label: "Planszówki", icon: Dices },
    { href: "/katalog?collectionType=RPG", label: "RPG", icon: Scroll },
  ];

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-16 md:gap-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav links={navLinks} user={user} />
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 font-display text-foreground transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              Z
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-medium tracking-tight">Zakątek Fantastyki</span>
              <span className="text-[0.6875rem] font-normal text-muted-foreground">
                Biblioteka gier
              </span>
            </span>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex lg:max-w-md xl:max-w-lg">
          <HeaderSearch />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Główna nawigacja">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="site-nav-link rounded-md px-3 py-2">
              {label}
            </Link>
          ))}
          {user && (
            <Link href="/moje-rezerwacje" className="site-nav-link rounded-md px-3 py-2">
              Rezerwacje
            </Link>
          )}
          {user && isStaff(user.role) && (
            <Link
              href="/admin"
              className="site-nav-link inline-flex items-center gap-1.5 rounded-md px-3 py-2"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Panel
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user && (
            <NotificationBell initialCount={unreadCount} initialItems={notifications} />
          )}
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/moje-konto">
                  <User className="h-4 w-4" aria-hidden />
                  <span className="hidden max-w-[8rem] truncate lg:inline">
                    {user.fullName ?? user.email}
                  </span>
                </Link>
              </Button>
              <form action={logoutAction}>
                <Button variant="outline" size="sm" type="submit" data-testid="logout-button">
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden md:inline">Wyloguj</span>
                </Button>
              </form>
            </>
          ) : (
            <Button size="sm" className="site-login-btn font-medium" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="hidden xs:inline sm:inline">Zaloguj</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="border-t border-border/50 px-4 pb-3 pt-2 lg:hidden">
        <HeaderSearch />
      </div>
    </header>
  );
}
