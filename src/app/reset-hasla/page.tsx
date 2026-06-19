import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "Reset hasła" };

export default function ResetPasswordPage() {
  return (
    <PageShell width="narrow" className="py-12">
      <Card className="card-elevated shadow-soft">
        <CardHeader>
          <CardTitle>Nie pamiętam hasła</CardTitle>
          <CardDescription>
            Podaj adres e-mail powiązany z kontem. Wyślemy link do ustawienia nowego hasła.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={requestPasswordResetAction}
            submitLabel="Wyślij link resetujący"
            fields={[{ name: "email", label: "E-mail", type: "email" }]}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary underline-offset-2 hover:underline">
              Wróć do logowania
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
