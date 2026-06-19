import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyForm } from "@/components/admin/copy-form";
import { CopyStatusQuickActions } from "@/components/admin/copy-status-quick-actions";
import { getCopyForEdit } from "@/lib/actions/copies";
import { requireStaff } from "@/lib/auth/guards";
import { allowedCopyStatusTargets } from "@/lib/services/copy-status";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { CopyStatus } from "@prisma/client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCopyForEdit(id);
  return { title: data ? `Egzemplarz ${data.copy.inventoryNumber}` : "Egzemplarz" };
}

export default async function AdminCopyEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const data = await getCopyForEdit(id);
  if (!data) notFound();

  const { copy, ctx } = data;
  const allowedStatuses = allowedCopyStatusTargets(copy.status, ctx);

  const games = await prisma.game.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-8 overflow-x-hidden">
      <PageHeader
        title={`Egzemplarz ${copy.inventoryNumber}`}
        description={copy.game.title}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/egzemplarze">← Lista</Link>
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <SectionCard title="Edycja">
          <CopyForm
            copy={{
              id: copy.id,
              gameId: copy.gameId,
              inventoryNumber: copy.inventoryNumber,
              barcode: copy.barcode,
              status: copy.status,
              condition: copy.condition,
              location: copy.location,
              notes: copy.notes,
            }}
            games={games}
            allowedStatuses={allowedStatuses}
            useFullEdit
          />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Status i kontekst">
            <div className="space-y-3 text-sm">
              <StatusBadge kind="copy" status={copy.status} />
              {copy.loans[0] && (
                <p>
                  Aktywne wypożyczenie:{" "}
                  {copy.loans[0].user.fullName ?? copy.loans[0].user.email}
                </p>
              )}
              {copy.reservations[0] && (
                <p>
                  Aktywna rezerwacja:{" "}
                  {copy.reservations[0].user.fullName ?? copy.reservations[0].user.email}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Szybka zmiana statusu">
            <p className="mb-3 text-xs text-muted-foreground">
              Walidowane przejścia — np. uszkodzony, zgubiony, wycofany.
            </p>
            <CopyStatusQuickActions copyId={copy.id} currentStatus={copy.status as CopyStatus} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
