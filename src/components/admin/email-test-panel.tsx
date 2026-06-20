"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendAdminTestEmailAction } from "@/lib/actions/admin-email-test";

export function EmailTestPanel() {
  const [pending, startTransition] = useTransition();

  function sendTest() {
    startTransition(async () => {
      const result = await sendAdminTestEmailAction();
      if (!result.success) toast.error(result.error);
      else toast.success("Testowy e-mail wysłany na Twój adres administratora.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test e-mail (Resend)</CardTitle>
        <CardDescription>
          Wysyła jedną wiadomość testową na adres zalogowanego administratora. Nie wysyła masowych
          powiadomień.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" disabled={pending} onClick={sendTest}>
          {pending ? "Wysyłanie…" : "Wyślij testowy e-mail"}
        </Button>
      </CardContent>
    </Card>
  );
}
