import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { getSessionUser, isStaff } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="group flex items-baseline gap-2 font-display text-foreground transition-colors hover:text-primary"
        >
          <span className="text-lg font-medium tracking-tight md:text-xl">Zakątek</span>
          <span className="hidden text-sm font-normal text-muted-foreground sm:inline">
            Biblioteka gier
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/katalog" className="site-nav-link">
            Katalog
          </Link>
          {user && (
            <Link href="/moje-rezerwacje" className="site-nav-link">
              Rezerwacje
            </Link>
          )}
          {user && isStaff(user.role) && (
            <Link href="/admin" className="site-nav-link inline-flex items-center gap-1.5">
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
            <Button size="sm" className="site-login-btn h-9 rounded-md px-4 font-medium" asChild>
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
