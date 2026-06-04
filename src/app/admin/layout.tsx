import { requireStaffFromDb } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffFromDb();
  const label = user.fullName?.trim() || user.email;

  return <AdminShell userLabel={label}>{children}</AdminShell>;
}
