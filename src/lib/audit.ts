import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logAudit(params: {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  } catch (e) {
    console.error("Audit log failed", e);
  }
}
