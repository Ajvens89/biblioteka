import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Reset hasła" };

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      title="Reset hasła"
      description="Podaj adres e-mail powiązany z kontem. Wyślemy link do ustawienia nowego hasła."
    >
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <AuthForm
            action={requestPasswordResetAction}
            submitLabel="Wyślij link resetujący"
            fields={[{ name: "email", label: "E-mail", type: "email" }]}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
              Wróć do logowania
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
