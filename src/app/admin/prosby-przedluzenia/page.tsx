import { requireStaff } from "@/lib/auth/guards";
import { getPendingExtensionRequests } from "@/lib/actions/extension-requests";
import { ExtensionRequestsPanel } from "@/components/admin/extension-requests-panel";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export const metadata = { title: "Prośby o przedłużenie" };

export default async function ExtensionRequestsPage() {
  await requireStaff();
  const requests = await getPendingExtensionRequests();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prośby o przedłużenie"
        description="Zatwierdzaj lub odrzucaj prośby użytkowników o wydłużenie terminu zwrotu."
      />
      <SectionCard title="Oczekujące">
        <ExtensionRequestsPanel requests={requests} />
      </SectionCard>
    </div>
  );
}
