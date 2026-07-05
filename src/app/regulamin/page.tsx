import { getAppSettings } from "@/lib/settings";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";

export const metadata = { title: "Regulamin" };

const TERMS_UPDATED = "2026-03-01";

export default async function TermsPage() {
  const settings = await getAppSettings();

  return (
    <PageShell width="narrow" className="space-y-8 py-8 md:py-12">
      <header className="space-y-2">
        <p className="text-eyebrow">Biblioteka gier</p>
        <h1 className="text-h2">Regulamin</h1>
        <p className="text-small text-muted-foreground">
          Ostatnia aktualizacja: {new Date(TERMS_UPDATED).toLocaleDateString("pl-PL")}
        </p>
      </header>

      <SectionCard title="Postanowienia ogólne">
        <div className="prose-game whitespace-pre-wrap text-sm text-muted-foreground">{settings.termsText}</div>
      </SectionCard>

      <SectionCard title="Kontakt i odbiór">
        <p className="text-sm text-muted-foreground">
          Adres fundacji: <span className="font-medium text-foreground">{settings.foundationAddress}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pytania:{" "}
          <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">
            {settings.contactEmail}
          </a>
        </p>
      </SectionCard>
    </PageShell>
  );
}
