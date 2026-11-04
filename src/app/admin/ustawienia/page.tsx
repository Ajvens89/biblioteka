import { requireAdmin } from "@/lib/auth/guards";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getAppSettings } from "@/lib/settings";

export const metadata = { title: "Ustawienia katalogu" };
export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();
  return <div className="space-y-6 overflow-x-hidden">
    <PageHeader title="Ustawienia katalogu" description="Dane kontaktowe Fundacji widoczne na stronie." />
    <SectionCard title="Kontakt"><SettingsForm settings={settings} /></SectionCard>
  </div>;
}
