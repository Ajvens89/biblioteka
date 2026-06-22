import { requireAdmin } from "@/lib/auth/guards";
import { SettingsForm } from "@/components/admin/settings-form";
import { EmailTestPanel } from "@/components/admin/email-test-panel";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getAppSettings } from "@/lib/settings";

export const metadata = { title: "Ustawienia" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        title="Ustawienia systemu"
        description="Parametry biblioteki, powiadomienia e-mail i test wysyłki."
      />
      <SectionCard title="Test e-mail (Resend)" description="Wyłącznie dla administratora — jedna wiadomość testowa.">
        <EmailTestPanel />
      </SectionCard>
      <SectionCard title="Parametry wypożyczeń" description="Terminy, limity i zachowanie systemu.">
        <SettingsForm settings={settings} />
      </SectionCard>
    </div>
  );
}
