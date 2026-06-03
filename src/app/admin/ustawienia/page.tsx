import { requireAdmin } from "@/lib/auth/guards";
import { SettingsForm } from "@/components/admin/settings-form";
import { getAppSettings } from "@/lib/settings";

export const metadata = { title: "Ustawienia" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ustawienia systemu</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
