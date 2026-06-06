import Link from "next/link";
import { BookOpen, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { getSessionUser, isStaff } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="site-header sticky top-0 z-50 border-b border-border/70 bg-card/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Link
          href="/"
          className="site-logo group flex items-center gap-2.5 font-display font-semibold text-foreground transition-colors hover:text-primary"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15 transition group-hover:bg-primary/15">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold">{APP_NAME}</span>
            <span className="block text-[11px] font-normal text-muted-foreground">Biblioteka gier</span>
          </span>
          <span className="font-display text-base sm:hidden">Zakątek</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link href="/katalog" className="site-nav-link rounded-lg px-3 py-2">
            Katalog
          </Link>
          {user && (
            <Link href="/moje-rezerwacje" className="site-nav-link rounded-lg px-3 py-2">
              Moje rezerwacje
            </Link>
          )}
          {user && isStaff(user.role) && (
            <Link
              href="/admin"
              className="site-nav-link flex items-center gap-1.5 rounded-lg px-3 py-2"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/moje-konto">
                  <User className="h-4 w-4" aria-hidden />
                  <span className="hidden lg:inline">{user.fullName ?? user.email}</span>
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
            <Button size="sm" className="site-login-btn rounded-lg px-4 font-semibold shadow-md" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden />
                Zaloguj
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
