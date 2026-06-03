import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Rejestracja" };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Rejestracja</CardTitle>
          <CardDescription>Utwórz konto w bibliotece</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={registerAction}
            submitLabel="Załóż konto"
            fields={[
              { name: "fullName", label: "Imię i nazwisko" },
              { name: "email", label: "E-mail", type: "email" },
              { name: "password", label: "Hasło", type: "password" },
              { name: "confirmPassword", label: "Powtórz hasło", type: "password" },
            ]}
          />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Masz konto?{" "}
            <Link href="/login" className="text-primary underline">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
