import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthModeBanner } from "@/components/auth/auth-mode-banner";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Logowanie" };

type Props = { searchParams: Promise<{ redirect?: string; registered?: string; reset?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectPath = safeRedirectPath(params.redirect);
  const registerHref = params.redirect
    ? `/rejestracja?redirect=${encodeURIComponent(params.redirect)}`
    : "/rejestracja";

  return (
    <AuthPageShell
      title="Logowanie"
      description="Zaloguj się, aby rezerwować gry i śledzić wypożyczenia."
    >
      <Card className="card-elevated" data-testid="login-page">
        <CardContent className="pt-6">
          {params.reset === "1" && (
            <p
              className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm"
              role="status"
            >
              Hasło zostało zmienione. Możesz się teraz zalogować.
            </p>
          )}
          {params.registered === "1" && (
            <p
              className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm"
              role="status"
            >
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
    </AuthPageShell>
  );
}
