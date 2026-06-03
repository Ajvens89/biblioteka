import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p>© {new Date().getFullYear()} {APP_NAME} — Fundacja Zakątek Fantastyki</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/regulamin" className="hover:text-foreground">
            Regulamin
          </Link>
          <Link href="/kontakt" className="hover:text-foreground">
            Kontakt
          </Link>
          <Link href="/katalog" className="hover:text-foreground">
            Katalog gier
          </Link>
        </nav>
      </div>
    </footer>
  );
}
