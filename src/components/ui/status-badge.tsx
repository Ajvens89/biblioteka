import type { CopyStatus, LoanStatus, ReservationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { copyStatusUi, loanStatusUi, reservationStatusUi } from "@/lib/status-ui";

type Props = {
  kind: "reservation" | "loan" | "copy";
  status: ReservationStatus | LoanStatus | CopyStatus;
  className?: string;
};

export function StatusBadge({ kind, status, className }: Props) {
  const ui =
    kind === "reservation"
      ? reservationStatusUi(status as ReservationStatus)
      : kind === "loan"
        ? loanStatusUi(status as LoanStatus)
        : copyStatusUi(status as CopyStatus);

  return (
    <Badge variant={ui.variant} className={className} aria-label={`Status: ${ui.label}`}>
      {ui.label}
    </Badge>
  );
}
