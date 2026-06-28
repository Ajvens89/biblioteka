import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, LogIn, LogOut, User } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { getNotifications, getUnreadNotificationCount } from "@/lib/actions/notifications";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HeaderSearch } from "@/components/layout/header-search";
import { SiteHeaderShell } from "@/components/layout/site-header-shell";
import { SiteNavLink } from "@/components/layout/site-nav-link";

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
    <SiteHeaderShell>
      <div className="site-header-inner mx-auto flex h-[3.75rem] w-full max-w-[90rem] items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav links={navLinks} user={user} />
          <BrandLogo size="sm" />
        </div>

        <Suspense fallback={null}>
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Główna nawigacja">
            {navLinks.map(({ href, label }) => (
              <SiteNavLink key={href} href={href} className="min-h-11 px-3.5 py-2">
                {label}
              </SiteNavLink>
            ))}
            {user ? (
              <SiteNavLink href="/moje-konto" className="min-h-11 px-3.5 py-2">
                Moje konto
              </SiteNavLink>
            ) : null}
            <SiteNavLink
              href={FOUNDATION_URL}
              external
              className="site-foundation-link inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2"
            >
              Strona Fundacji
              <ExternalLink className="site-nav-icon h-3.5 w-3.5 opacity-70" aria-hidden />
            </SiteNavLink>
          </nav>
        </Suspense>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user && (
            <NotificationBell initialCount={unreadCount} initialItems={notifications} />
          )}
          {user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/moje-konto">
                  <User className="h-4 w-4" aria-hidden />
                  <span className="hidden max-w-[8rem] truncate md:inline">
                    {user.fullName ?? "Konto"}
                  </span>
                </Link>
              </Button>
              <form action={logoutAction} className="hidden sm:block">
                <Button variant="ghost" size="sm" type="submit" data-testid="logout-button">
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden lg:inline">Wyloguj</span>
                </Button>
              </form>
            </>
          ) : (
            <Button size="sm" variant="default" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Zaloguj</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="site-header-search border-t border-border/40 px-4 pb-3 pt-2 lg:hidden">
        <HeaderSearch />
      </div>
    </SiteHeaderShell>
  );
}
