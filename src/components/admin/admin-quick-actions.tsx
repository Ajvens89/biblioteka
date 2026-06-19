import Link from "next/link";
import {
  AlertTriangle,
  Barcode,
  BookCopy,
  CalendarCheck,
  ClipboardList,
  Plus,
  ScanLine,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { href: "/admin/gry/nowa", label: "Dodaj grę", icon: Plus, testId: "admin-quick-add-game", primary: true },
  { href: "/admin/gry/nowa?mode=ean", label: "Dodaj przez EAN", icon: Barcode, testId: "admin-quick-add-ean" },
  { href: "/admin/gry/nowa?mode=ean&scan=1", label: "Skanuj EAN", icon: ScanLine, testId: "admin-quick-scan-ean" },
  { href: "/admin/import", label: "Import products.json", icon: Upload, testId: "admin-quick-import" },
  { href: "/admin/import#audit", label: "Audyt EAN", icon: Barcode, testId: "admin-quick-audit" },
  { href: "/admin/rezerwacje?status=PENDING", label: "Rezerwacje do obsługi", icon: CalendarCheck, testId: "admin-quick-reservations" },
  { href: "/admin/obsluga", label: "Obsługa skanem", icon: ScanLine, testId: "admin-quick-circulation" },
  { href: "/admin/wypozyczenia?status=OVERDUE", label: "Wypożyczenia przeterminowane", icon: AlertTriangle, testId: "admin-quick-overdue" },
  { href: "/admin/egzemplarze", label: "Dodaj egzemplarz", icon: BookCopy, testId: "admin-quick-add-copy" },
  { href: "/admin/wypozyczenia", label: "Wypożyczenia", icon: ClipboardList, testId: "admin-quick-loans" },
];

export function AdminQuickActions() {
  return (
    <div className="flex flex-wrap gap-2" data-testid="admin-quick-actions">
      {actions.map(({ href, label, icon: Icon, testId, primary }) => (
        <Button key={testId} variant={primary ? "default" : "outline"} size="sm" asChild>
          <Link href={href} data-testid={testId}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
