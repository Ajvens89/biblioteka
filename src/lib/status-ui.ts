import type { CopyStatus, LoanStatus, ReservationStatus } from "@prisma/client";
import {
  COPY_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";

export type StatusBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

export function reservationStatusUi(status: ReservationStatus): {
  label: string;
  variant: StatusBadgeVariant;
} {
  const label = RESERVATION_STATUS_LABELS[status];
  switch (status) {
    case "PENDING":
      return { label, variant: "warning" };
    case "APPROVED":
      return { label, variant: "secondary" };
    case "READY_FOR_PICKUP":
      return { label, variant: "success" };
    case "BORROWED":
      return { label, variant: "default" };
    case "RETURNED":
      return { label, variant: "outline" };
    case "CANCELLED":
    case "EXPIRED":
      return { label, variant: "destructive" };
    default:
      return { label, variant: "outline" };
  }
}

export function loanStatusUi(status: LoanStatus): { label: string; variant: StatusBadgeVariant } {
  const label = LOAN_STATUS_LABELS[status];
  switch (status) {
    case "ACTIVE":
      return { label, variant: "default" };
    case "RETURNED":
      return { label, variant: "outline" };
    case "OVERDUE":
      return { label, variant: "destructive" };
    case "LOST":
    case "DAMAGED":
      return { label, variant: "warning" };
    default:
      return { label, variant: "outline" };
  }
}

export function copyStatusUi(status: CopyStatus): { label: string; variant: StatusBadgeVariant } {
  const label = COPY_STATUS_LABELS[status];
  switch (status) {
    case "AVAILABLE":
      return { label, variant: "success" };
    case "RESERVED":
      return { label, variant: "warning" };
    case "BORROWED":
      return { label, variant: "default" };
    case "DAMAGED":
    case "LOST":
      return { label, variant: "destructive" };
    default:
      return { label, variant: "secondary" };
  }
}
