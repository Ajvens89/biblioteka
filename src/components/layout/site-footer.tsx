import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { getAppSettings } from "@/lib/settings";

const FOUNDATION_URL = "https://zakatekfantastyki.pl/";
export async function SiteFooter() {
  const settings = await getAppSettings();
  const loanEmail = settings.contactEmail || FOUNDATION_LOAN_EMAIL;
  const phone = settings.contactPhone.trim();
  const showPhone = Boolean(phone && phone !== "+48 000 000 000");

  return (
    <footer className="zf-footer mt-auto">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-12 md:px-6 md:py-14">
        <p className="mb-8 font-display text-2xl font-medium text-primary md:text-3xl">Twój następny wieczór zaczyna się tutaj</p>

        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-12">
          <div className="space-y-4">
            <BrandLogo showSubtitle subtitle="Katalog gier" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Biblioteka gier planszowych i fabularnych prowadzona przez Fundację Zakątek Fantastyki
              w Bielsku-Białej. Przeglądaj tytuły, wydawców, okładki i opisy gier.
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
                <Link href="/kontakt" className="site-footer-link">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/login" target="_blank" rel="noopener noreferrer" className="site-footer-link">
                  Logowanie właściciela
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-eyebrow mb-4">Kontakt</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>{settings.foundationAddress}</li>
              <li>
                <a href={`mailto:${loanEmail}`} className="site-footer-link break-all text-primary">
                  {loanEmail}
                </a>
              </li>
              {showPhone ? (
                <li>
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="site-footer-link">
                    {phone}
                  </a>
                </li>
              ) : null}
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
