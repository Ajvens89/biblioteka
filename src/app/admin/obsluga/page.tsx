import { requireStaff } from "@/lib/auth/guards";
import { CirculationPanel } from "@/components/admin/circulation-panel";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Obsługa — skan" };

export default async function AdminCirculationPage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-lg space-y-6 overflow-x-hidden pb-8">
      <PageHeader
        title="Obsługa na miejscu"
        description="Skan użytkownika i egzemplarza — szybkie wydanie lub zwrot."
      />
      <CirculationPanel />
    </div>
  );
}
