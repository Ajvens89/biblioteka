import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { getAppSettings } from "@/lib/settings";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";

export const metadata = { title: "Regulamin" };

const TERMS_UPDATED = "2026-07-05";

export default async function TermsPage() {
  const settings = await getAppSettings();
  const loanEmail = settings.contactEmail || FOUNDATION_LOAN_EMAIL;

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

      <SectionCard title="Wypożyczenia">
        <p className="text-sm text-muted-foreground">
          Katalog online służy do przeglądania zbiorów. Informacje o wypożyczeniu uzyskasz pod adresem{" "}
          <a href={`mailto:${loanEmail}`} className="font-medium text-primary hover:underline">
            {loanEmail}
          </a>
          .
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Adres fundacji: <span className="font-medium text-foreground">{settings.foundationAddress}</span>
        </p>
      </SectionCard>
    </PageShell>
  );
}
