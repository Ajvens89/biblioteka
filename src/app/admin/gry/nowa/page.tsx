import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { AdminGameWizard } from "@/components/admin/admin-new-game-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Nowa gra" };

type Props = { searchParams: Promise<{ mode?: string; scan?: string }> };

export default async function NewGamePage({ searchParams }: Props) {
  await requireAdmin();
  const { mode, scan } = await searchParams;
  const [publishers, designers, categories, tags] = await Promise.all([
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
    prisma.designer.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nowa gra"
        description="Kreator krok po kroku — EAN nie tworzy gry automatycznie bez zatwierdzenia."
      />
      <AdminGameWizard
        publishers={publishers}
        designers={designers}
        categories={categories}
        tags={tags}
        initialSource={mode === "manual" ? "manual" : "ean"}
        openScanner={scan === "1"}
      />
    </div>
  );
}
