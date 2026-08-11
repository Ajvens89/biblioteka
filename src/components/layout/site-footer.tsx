import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { getAppSettings } from "@/lib/settings";

const FOUNDATION_URL = "https://zakatekfantastyki.pl/";
const PHONE = "+48573232474";
const PHONE_DISPLAY = "+48 573232474";

export async function SiteFooter() {
  const settings = await getAppSettings();
  const loanEmail = settings.contactEmail || FOUNDATION_LOAN_EMAIL;

  return (
    <footer className="zf-footer mt-auto">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-12 md:px-6 md:py-14">
        <p className="mb-8 font-display text-2xl font-medium text-primary md:text-3xl">540 światów</p>

        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-12">
          <div className="space-y-4">
            <BrandLogo showSubtitle subtitle="Biblioteka gier" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Biblioteka gier planszowych i fabularnych prowadzona przez Fundację Zakątek Fantastyki
              w Bielsku-Białej. Wypożyczasz za darmo, grasz z bliskimi.
            </p>
          </div>

          <nav aria-label="Nawigacja w stopce">
            <h2 className="text-eyebrow mb-4">Biblioteka</h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/katalog?collectionType=BOARD_GAME" className="site-footer-link">
                  Planszówki
                </Link>
              </li>
              <li>
                <Link href="/katalog?collectionType=RPG" className="site-footer-link">
                  RPG
                </Link>
              </li>
              <li>
                <Link href="/katalog" className="site-footer-link">
                  Cały katalog
                </Link>
              </li>
              <li>
                <Link href="/jak-wypozyczyc" className="site-footer-link">
                  Jak wypożyczyć
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="site-footer-link">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/regulamin" className="site-footer-link">
                  Regulamin
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-eyebrow mb-4">Kontakt</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>{settings.foundationAddress}</li>
              <li>
                <a href={`mailto:${loanEmail}`} className="site-footer-link text-primary">
                  {loanEmail}
                </a>
              </li>
              <li>
                <a href={`tel:${PHONE}`} className="site-footer-link">
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={FOUNDATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer-link"
                >
                  zakatekfantastyki.pl
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Fundacja Zakątek Fantastyki · Katalog biblioteki gier</p>
        </div>
      </div>
    </footer>
  );
}
