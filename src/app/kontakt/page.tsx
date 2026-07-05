import { getAppSettings } from "@/lib/settings";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";

export const metadata = { title: "Kontakt" };

export default async function ContactPage() {
  const settings = await getAppSettings();

  return (
    <PageShell width="narrow" className="space-y-8 py-8 md:py-12">
      <header className="space-y-2">
        <p className="text-eyebrow">Fundacja Zakątek Fantastyki</p>
        <h1 className="text-h2">Kontakt</h1>
        <p className="text-body text-muted-foreground">
          Masz pytanie o katalog, wypożyczenia lub współpracę? Napisz lub zadzwoń.
        </p>
      </header>

      <SectionCard title="Dane kontaktowe">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Adres</dt>
            <dd className="mt-1 font-medium">{settings.foundationAddress}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="mt-1">
              <a href={`mailto:${settings.contactEmail}`} className="font-medium text-primary hover:underline">
                {settings.contactEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Telefon</dt>
            <dd className="mt-1 font-medium">{settings.contactPhone}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Jak do nas trafić">
        <p className="text-sm text-muted-foreground">
          Biblioteka znajduje się w siedzibie fundacji. Odbiór zarezerwowanych gier odbywa się w godzinach
          otwarcia — szczegóły w{" "}
          <a href="/regulamin" className="text-primary hover:underline">
            regulaminie biblioteki
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
