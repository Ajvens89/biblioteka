import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { getAppSettings } from "@/lib/settings";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";

export const metadata = { title: "Kontakt" };

export default async function ContactPage() {
  const settings = await getAppSettings();
  const loanEmail = settings.contactEmail || FOUNDATION_LOAN_EMAIL;

  return (
    <PageShell width="narrow" className="space-y-8 py-8 md:py-12">
      <header className="space-y-2">
        <p className="text-eyebrow">Fundacja Zakątek Fantastyki</p>
        <h1 className="text-h2">Kontakt</h1>
        <p className="text-body text-muted-foreground">
          Katalog działa w trybie poglądu. W sprawie wypożyczeń i współpracy napisz na poniższy adres.
        </p>
      </header>

      <SectionCard title="Wypożyczenia i pytania">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="mt-1">
              <a href={`mailto:${loanEmail}`} className="font-medium text-primary hover:underline">
                {loanEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Adres</dt>
            <dd className="mt-1 font-medium">{settings.foundationAddress}</dd>
          </div>
          {settings.contactPhone && settings.contactPhone !== "+48 000 000 000" && (
            <div>
              <dt className="text-muted-foreground">Telefon</dt>
              <dd className="mt-1 font-medium">{settings.contactPhone}</dd>
            </div>
          )}
        </dl>
      </SectionCard>

      <SectionCard title="Jak do nas trafić">
        <p className="text-sm text-muted-foreground">
          Odbiór gier odbywa się w siedzibie fundacji — szczegóły ustalasz mailowo. Zobacz też{" "}
          <a href="/regulamin" className="text-primary hover:underline">
            regulamin biblioteki
          </a>
          .
        </p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.foundationAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Otwórz w Mapach Google →
        </a>
      </SectionCard>
    </PageShell>
  );
}
