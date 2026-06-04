import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "Rejestracja" };

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const loginHref = params.redirect
    ? `/login?redirect=${encodeURIComponent(params.redirect)}`
    : "/login";

  return (
    <PageShell width="narrow" className="py-12">
      <Card className="card-elevated shadow-soft" data-testid="register-page">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-h2">Rejestracja</CardTitle>
          <CardDescription>Bezpłatne konto w bibliotece gier Zakątka Fantastyki.</CardDescription>
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
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Masz konto?{" "}
            <Link href={loginHref} className="font-medium text-primary underline-offset-2 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
