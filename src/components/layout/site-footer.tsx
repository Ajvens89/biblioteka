import Link from "next/link";
import { BookOpen, Dices, ExternalLink, Mail, MapPin, Scroll, ScrollText } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { getAppSettings } from "@/lib/settings";

const FOUNDATION_URL = "https://zakatekfantastyki.pl/";

const links = {
  biblioteka: [
    { href: "/katalog", label: "Katalog gier", icon: BookOpen },
    { href: "/katalog?collectionType=BOARD_GAME", label: "Planszówki", icon: Dices },
    { href: "/katalog?collectionType=RPG", label: "Gry fabularne", icon: Scroll },
  ],
  informacje: [
    { href: "/regulamin", label: "Regulamin", icon: ScrollText },
    { href: "/kontakt", label: "Kontakt", icon: Mail },
    { href: FOUNDATION_URL, label: "Strona Fundacji", icon: ExternalLink, external: true },
  ],
};

export async function SiteFooter() {
  const settings = await getAppSettings();
  const loanEmail = settings.contactEmail || FOUNDATION_LOAN_EMAIL;

  return (
    <footer className="zf-footer mt-auto">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-12 md:px-6 md:py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-12">
          <div className="space-y-4">
            <BrandLogo showSubtitle subtitle="Biblioteka Zakątka Fantastyki" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Biblioteka prowadzona przez{" "}
              <strong className="font-medium text-foreground">Fundację Zakątek Fantastyki</strong>.
              Przeglądaj katalog online. W sprawie wypożyczeń napisz na{" "}
              <a href={`mailto:${loanEmail}`} className="font-medium text-[var(--zf-green-500)] hover:underline">
                {loanEmail}
              </a>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--zf-green-500)]" aria-hidden />
                <span>{settings.foundationAddress}</span>
              </span>
            </p>
            <a
              href={FOUNDATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-link inline-flex items-center gap-2 text-sm font-medium text-[var(--zf-green-500)]"
            >
              zakatekfantastyki.pl
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>

          <div>
            <h3 className="text-eyebrow mb-4">Biblioteka</h3>
            <ul className="space-y-2.5 text-sm">
              {links.biblioteka.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="site-footer-link inline-flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5 opacity-60" aria-hidden />}
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-eyebrow mb-4">Informacje</h3>
            <ul className="space-y-2.5 text-sm">
              {links.informacje.map(({ href, label, icon: Icon, external }) => (
                <li key={href}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="site-footer-link inline-flex items-center gap-2"
                    >
                      <Icon className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      {label}
                    </a>
                  ) : (
                    <Link href={href} className="site-footer-link inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Biblioteka Zakątka Fantastyki</p>
          <p>Katalog w trybie poglądu</p>
        </div>
      </div>
    </footer>
  );
}
