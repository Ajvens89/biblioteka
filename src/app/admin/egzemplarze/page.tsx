import { requireStaff } from "@/lib/auth/guards";
import { COPY_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { CopyForm } from "@/components/admin/copy-form";
import { CopyQr } from "@/components/admin/copy-qr";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Egzemplarze" };

export default async function AdminCopiesPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string }>;
}) {
  await requireStaff();
  const { scan } = await searchParams;

  const [copies, games] = await Promise.all([
    prisma.gameCopy.findMany({
      include: { game: true },
      orderBy: { inventoryNumber: "asc" },
    }),
    prisma.game.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const highlighted = scan
    ? copies.find((c) => c.barcode === scan || c.inventoryNumber === scan)
    : null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Egzemplarze</h1>

      {highlighted && (
        <div className="rounded-lg border border-primary bg-primary/5 p-4">
          <p className="font-medium">Znaleziono: {highlighted.game.title}</p>
          <p className="text-sm">{highlighted.inventoryNumber}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Dodaj egzemplarz</h2>
          <CopyForm games={games} />
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">Skanuj kod</h2>
          <form className="flex gap-2" action="/admin/egzemplarze" method="get">
            <input
              name="scan"
              placeholder="Numer inwentarzowy lub kod kreskowy"
              className="h-10 flex-1 rounded-md border px-3 text-sm"
              defaultValue={scan}
            />
            <button type="submit" className="rounded-md bg-primary px-4 text-sm text-primary-foreground">
              Szukaj
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Nr inw.</th>
              <th className="p-3 text-left">Gra</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">QR</th>
            </tr>
          </thead>
          <tbody>
            {copies.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.inventoryNumber}</td>
                <td className="p-3">{c.game.title}</td>
                <td className="p-3">
                  <Badge>{COPY_STATUS_LABELS[c.status]}</Badge>
                </td>
                <td className="p-3">
                  <CopyQr inventoryNumber={c.inventoryNumber} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
