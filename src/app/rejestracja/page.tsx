import { redirect } from "next/navigation";

export const metadata = { title: "Rejestracja" };

/** Rejestracja publiczna wyłączona — katalog w trybie poglądu. */
export default function RegisterPage() {
  redirect("/kontakt");
}
