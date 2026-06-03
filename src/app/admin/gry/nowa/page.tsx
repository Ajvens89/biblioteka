import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { GameForm } from "@/components/admin/game-form";

export const metadata = { title: "Nowa gra" };

export default async function NewGamePage() {
  await requireAdmin();
  const [publishers, designers, categories, tags] = await Promise.all([
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
    prisma.designer.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nowa gra</h1>
      <GameForm publishers={publishers} designers={designers} categories={categories} tags={tags} />
    </div>
  );
}
