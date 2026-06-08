import Link from "next/link";
import { Mail, MapPin, ScrollText } from "lucide-react";
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
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <p className="font-display text-xl font-medium text-foreground">{APP_NAME}</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Biblioteka gier planszowych i RPG prowadzona przez{" "}
              <strong className="font-medium text-foreground">Fundację Zakątek Fantastyki</strong>.
              Rezerwuj online, odbieraj na miejscu.
            </p>
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Fundacja Zakątek Fantastyki
            </p>
          </div>

          <div>
            <h3 className="text-eyebrow mb-4 text-[var(--zf-gold)]">Biblioteka</h3>
            <ul className="space-y-2.5 text-sm">
              {links.biblioteka.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="site-footer-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-eyebrow mb-4 text-[var(--zf-gold)]">Informacje</h3>
            <ul className="space-y-2.5 text-sm">
              {links.informacje.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="site-footer-link inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 opacity-60" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME}
          </p>
          <p>Wypożyczaj z głową · oddawaj na czas</p>
        </div>
      </div>
    </footer>
  );
}
