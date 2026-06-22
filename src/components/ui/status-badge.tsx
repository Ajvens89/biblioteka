import type { CopyStatus, LoanStatus, ReservationStatus } from "@prisma/client";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Package,
  PackageCheck,
  PackageX,
  Timer,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { copyStatusUi, loanStatusUi, reservationStatusUi } from "@/lib/status-ui";

type Props = {
  kind: "reservation" | "loan" | "copy";
  status: ReservationStatus | LoanStatus | CopyStatus;
  className?: string;
};

const ICONS: Record<string, LucideIcon> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  READY_FOR_PICKUP: PackageCheck,
  BORROWED: Package,
  RETURNED: CheckCircle2,
  CANCELLED: XCircle,
  EXPIRED: Timer,
  ACTIVE: Package,
  OVERDUE: AlertTriangle,
  LOST: PackageX,
  DAMAGED: AlertTriangle,
  AVAILABLE: CheckCircle2,
  RESERVED: CircleDashed,
  WITHDRAWN: Ban,
};

export function StatusBadge({ kind, status, className }: Props) {
  const ui =
    kind === "reservation"
      ? reservationStatusUi(status as ReservationStatus)
      : kind === "loan"
        ? loanStatusUi(status as LoanStatus)
        : copyStatusUi(status as CopyStatus);

  const Icon = ICONS[status] ?? CircleDashed;

  return (
    <Badge variant={ui.variant} className={className} aria-label={`Status: ${ui.label}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {ui.label}
    </Badge>
  );
}
