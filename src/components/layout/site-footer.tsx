import Link from "next/link";
import { BookOpen, Mail, MapPin, ScrollText } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const links = {
  biblioteka: [
    { href: "/katalog", label: "Katalog gier" },
    { href: "/katalog?collectionType=BOARD_GAME", label: "Planszówki" },
    { href: "/katalog?collectionType=RPG", label: "Gry fabularne" },
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
    <footer className="zf-footer mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 font-display text-lg font-semibold text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm">
                <BookOpen className="h-5 w-5" aria-hidden />
              </span>
              {APP_NAME}
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Profesjonalna biblioteka gier planszowych i RPG prowadzona przez{" "}
              <strong className="font-semibold text-foreground">Fundację Zakątek Fantastyki</strong>.
              Przeglądaj katalog, rezerwuj egzemplarze online i odbieraj w naszej siedzibie.
            </p>
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary/70" aria-hidden />
              Biblioteka Fundacji Zakątek Fantastyki
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
              Biblioteka
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.biblioteka.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="site-footer-link text-muted-foreground hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
              Informacje
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.informacje.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="site-footer-link inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Icon className="h-4 w-4 text-primary/70" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME} — Fundacja Zakątek Fantastyki
          </p>
          <p>Wypożyczaj z głową · oddawaj na czas · dziel się grą</p>
        </div>
      </div>
    </footer>
  );
}
