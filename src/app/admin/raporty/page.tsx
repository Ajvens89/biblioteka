import { redirect } from "next/navigation";

export const metadata = { title: "Raporty" };

/** Scalono z /admin/jakosc-danych — centrum jakości katalogu. */
export default function AdminReportsPage() {
  redirect("/admin/jakosc-danych");
}
