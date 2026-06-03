import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { GameForm } from "@/components/admin/game-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditGamePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: { categories: true, tags: true },
  });
  if (!game) notFound();

  const [publishers, designers, categories, tags] = await Promise.all([
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
    prisma.designer.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edycja: {game.title}</h1>
      <GameForm
        game={{
          ...game,
          categoryIds: game.categories.map((c) => c.categoryId),
          tagIds: game.tags.map((t) => t.tagId),
        }}
        publishers={publishers}
        designers={designers}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
