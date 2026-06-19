import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthModeBanner } from "@/components/auth/auth-mode-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "Logowanie" };

type Props = { searchParams: Promise<{ redirect?: string; registered?: string; reset?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectPath = safeRedirectPath(params.redirect);
  const registerHref = params.redirect
    ? `/rejestracja?redirect=${encodeURIComponent(params.redirect)}`
    : "/rejestracja";

  return (
    <PageShell width="narrow" className="py-12">
      <Card className="card-elevated shadow-soft" data-testid="login-page">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-h2" data-testid="login-heading">
            Logowanie
          </CardTitle>
          <CardDescription>Zaloguj się, aby rezerwować i śledzić wypożyczenia.</CardDescription>
        </CardHeader>
        <CardContent>
          {params.reset === "1" && (
            <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm" role="status">
              Hasło zostało zmienione. Możesz się teraz zalogować.
            </p>
          )}
          {params.registered === "1" && (
            <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm" role="status">
              Konto utworzone. Możesz się teraz zalogować.
            </p>
          )}
          <AuthModeBanner />
          <AuthForm
            action={loginAction}
            submitLabel="Zaloguj się"
            redirectPath={redirectPath}
            fields={[
              { name: "email", label: "E-mail", type: "email" },
              { name: "password", label: "Hasło", type: "password" },
            ]}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link href={registerHref} className="font-medium text-primary underline-offset-2 hover:underline">
              Zarejestruj się
            </Link>
            {" · "}
            <Link href="/reset-hasla" className="font-medium text-primary underline-offset-2 hover:underline">
              Nie pamiętam hasła
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
