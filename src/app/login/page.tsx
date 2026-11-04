import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Logowanie właściciela katalogu" };

type Props = { searchParams: Promise<{ redirect?: string; reset?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectPath = safeRedirectPath(params.redirect, "/admin");

  return (
    <AuthPageShell
      title="Panel właściciela"
      description="Zaloguj się, aby dodawać i edytować gry. Katalog publiczny działa bez konta."
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
            <Link href="/katalog" className="font-medium text-primary underline-offset-2 hover:underline">
              Wróć do katalogu
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
