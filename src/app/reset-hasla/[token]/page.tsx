import Link from "next/link";
import { confirmPasswordResetAction } from "@/lib/actions/password-reset";
import { ResetPasswordConfirmForm } from "@/components/auth/reset-password-confirm-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "Ustaw nowe hasło" };

type Props = { params: Promise<{ token: string }> };

export default async function ResetPasswordTokenPage({ params }: Props) {
  const { token } = await params;

  return (
    <PageShell width="narrow" className="py-12">
      <Card className="card-elevated shadow-soft">
        <CardHeader>
          <CardTitle>Ustaw nowe hasło</CardTitle>
          <CardDescription>
            Hasło musi mieć co najmniej 8 znaków, w tym literę i cyfrę.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordConfirmForm token={token} action={confirmPasswordResetAction} />
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
