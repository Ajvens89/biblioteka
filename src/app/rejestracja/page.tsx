import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Rejestracja" };

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const loginHref = params.redirect
    ? `/login?redirect=${encodeURIComponent(params.redirect)}`
    : "/login";

  return (
    <AuthPageShell
      title="Rejestracja"
      description="Bezpłatne konto w bibliotece gier Zakątka Fantastyki."
    >
      <Card className="card-elevated" data-testid="register-page">
        <CardContent className="pt-6">
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
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Masz konto?{" "}
            <Link href={loginHref} className="font-medium text-primary underline-offset-2 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
