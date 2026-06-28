import Link from "next/link";
import { ExternalLink, LogIn, LogOut, User } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { getNotifications, getUnreadNotificationCount } from "@/lib/actions/notifications";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HeaderSearch } from "@/components/layout/header-search";

const FOUNDATION_URL = "https://zakatekfantastyki.pl/";

export async function SiteHeader() {
  const user = await getSessionUser();
  const unreadCount = user ? await getUnreadNotificationCount() : 0;
  const notifications = user ? (await getNotifications(1)).items : [];

  const navLinks = [
    { href: "/katalog", label: "Katalog", icon: "catalog" as const },
    { href: "/katalog?collectionType=BOARD_GAME", label: "Planszówki", icon: "board" as const },
    { href: "/katalog?collectionType=RPG", label: "RPG", icon: "rpg" as const },
  ];

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav links={navLinks} user={user} />
          <BrandLogo size="sm" />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Główna nawigacja">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="site-nav-link rounded-xl px-3 py-2">
              {label}
            </Link>
          ))}
          {user ? (
            <Link href="/moje-konto" className="site-nav-link rounded-xl px-3 py-2">
              Moje konto
            </Link>
          ) : null}
          <a
            href={FOUNDATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-foundation-link inline-flex items-center gap-1 rounded-xl px-3 py-2"
          >
            Strona Fundacji
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user && (
            <NotificationBell initialCount={unreadCount} initialItems={notifications} />
          )}
          {user ? (
            <>
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <Link href="/moje-konto">
                  <User className="h-4 w-4" aria-hidden />
                  <span className="hidden max-w-[8rem] truncate md:inline">
                    {user.fullName ?? "Konto"}
                  </span>
                </Link>
              </Button>
              <form action={logoutAction} className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="rounded-xl"
                  data-testid="logout-button"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden lg:inline">Wyloguj</span>
                </Button>
              </form>
            </>
          ) : (
            <Button size="sm" className="site-login-btn rounded-xl" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Zaloguj</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="border-t border-border/60 px-4 pb-3 pt-2 lg:hidden">
        <HeaderSearch />
      </div>
    </header>
  );
}
