import Link from "next/link";
import { Barcode, Plus, Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { href: "/admin/gry/nowa?mode=manual", label: "Dodaj grę", icon: Plus, testId: "admin-quick-add-game", primary: true },
  { href: "/admin/gry/nowa?mode=ean", label: "Dodaj przez EAN", icon: Barcode, testId: "admin-quick-add-ean" },
  { href: "/admin/import", label: "Import / eksport katalogu", icon: Upload, testId: "admin-quick-import" },
  { href: "/admin/jakosc-danych", label: "Sprawdź metadane", icon: ShieldCheck, testId: "admin-quick-audit" },
];

export function AdminQuickActions() {
  return <div className="flex flex-wrap gap-2" data-testid="admin-quick-actions">{actions.map(({ href, label, icon: Icon, testId, primary }) => (
    <Button key={testId} variant={primary ? "default" : "outline"} size="sm" asChild>
      <Link href={href} data-testid={testId}><Icon className="h-4 w-4" aria-hidden />{label}</Link>
    </Button>
  ))}</div>;
}
