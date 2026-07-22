import Link from "next/link";
import { confirmPasswordResetAction } from "@/lib/actions/password-reset";
import { ResetPasswordConfirmForm } from "@/components/auth/reset-password-confirm-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Ustaw nowe hasło" };

type Props = { params: Promise<{ token: string }> };

export default async function ResetPasswordTokenPage({ params }: Props) {
  const { token } = await params;

  return (
    <AuthPageShell
      title="Ustaw nowe hasło"
      description="Hasło musi mieć co najmniej 12 znaków, w tym literę i cyfrę."
    >
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <ResetPasswordConfirmForm token={token} action={confirmPasswordResetAction} />
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
