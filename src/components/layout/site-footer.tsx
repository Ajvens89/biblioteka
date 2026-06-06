import Link from "next/link";
import { BookOpen, Mail, ScrollText } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const links = {
  biblioteka: [
    { href: "/katalog", label: "Katalog gier" },
    { href: "/login", label: "Logowanie" },
    { href: "/rejestracja", label: "Rejestracja" },
  ],
  informacje: [
    { href: "/regulamin", label: "Regulamin", icon: ScrollText },
    { href: "/kontakt", label: "Kontakt", icon: Mail },
  ],
};

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto border-t border-border/80">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-display font-semibold text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" aria-hidden />
              </span>
              {APP_NAME}
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Biblioteka gier planszowych i RPG Fundacji Zakątek Fantastyki. Wypożyczaj, graj i
              odkrywaj nowe światy — w naszej siedzibie i online.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Biblioteka</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {links.biblioteka.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="site-footer-link text-muted-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Informacje</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {links.informacje.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="site-footer-link inline-flex items-center gap-2 text-muted-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary/70" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {APP_NAME} — Fundacja Zakątek Fantastyki</p>
          <p>Wypożyczaj z głową · oddawaj na czas · dziel się grą</p>
        </div>
      </div>
    </footer>
  );
}
