import { requireAdmin } from "@/lib/auth/guards";
import { getDuplicateCandidatesAction } from "@/lib/actions/catalog-quality";
import { PageHeader } from "@/components/ui/page-header";
import { DuplicatesPanel } from "@/components/admin/duplicates-panel";

export const metadata = { title: "Duplikaty katalogu" };

export default async function DuplicatesPage() {
  await requireAdmin();
  const candidates = await getDuplicateCandidatesAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Potencjalne duplikaty"
        description="Porównanie i kontrolowane scalanie rekordów (ADMIN)."
      />
      <DuplicatesPanel candidates={candidates ?? []} />
    </div>
  );
}
