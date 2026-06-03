import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthModeBanner } from "@/components/auth/auth-mode-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card data-testid="login-page">
        <CardHeader>
          <CardTitle data-testid="login-heading">Logowanie</CardTitle>
          <CardDescription>Zaloguj się do biblioteki gier</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthModeBanner />
          <AuthForm
            action={loginAction}
            submitLabel="Zaloguj się"
            fields={[
              { name: "email", label: "E-mail", type: "email" },
              { name: "password", label: "Hasło", type: "password" },
            ]}
          />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link href="/rejestracja" className="text-primary underline">
              Zarejestruj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
