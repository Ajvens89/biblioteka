import { redirect } from "next/navigation";

export const metadata = { title: "Moje konto" };

/** Konto użytkownika publicznego wyłączone — logowanie tylko dla personelu. */
export default function AccountPage() {
  redirect("/kontakt");
}
