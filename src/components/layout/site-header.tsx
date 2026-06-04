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
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary transition-opacity hover:opacity-90">
          <BookOpen className="h-6 w-6" />
          <span className="hidden sm:inline">{APP_NAME}</span>
          <span className="sm:hidden">Zakątek</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm md:gap-2">
          <Link href="/katalog" className="rounded-md px-3 py-2 hover:bg-muted">
            Katalog
          </Link>
          {user && (
            <Link href="/moje-rezerwacje" className="rounded-md px-3 py-2 hover:bg-muted">
              Moje rezerwacje
            </Link>
          )}
          {user && isStaff(user.role) && (
            <Link
              href="/admin"
              className="flex items-center gap-1 rounded-md px-3 py-2 hover:bg-muted"
            >
              <LayoutDashboard className="h-4 w-4" />
              Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/moje-konto">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user.fullName ?? user.email}</span>
                </Link>
              </Button>
              <form action={logoutAction}>
                <Button variant="outline" size="sm" type="submit" data-testid="logout-button">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Wyloguj</span>
                </Button>
              </form>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Zaloguj
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
