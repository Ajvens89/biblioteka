import { redirect } from "next/navigation";

export const metadata = { title: "Moje rezerwacje" };

/** Publiczne rezerwacje wyłączone — katalog w trybie poglądu. */
export default function MyReservationsPage() {
  redirect("/kontakt");
}
