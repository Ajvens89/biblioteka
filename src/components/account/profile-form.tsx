"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateProfileAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  fullName,
  phone,
  emailNotificationsEnabled,
}: {
  fullName: string;
  phone: string;
  emailNotificationsEnabled: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const r = await updateProfileAction(null, fd);
          if (r.success) toast.success("Profil zapisany.");
          else toast.error(r.error);
        })
      }
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">Imię i nazwisko</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={phone} />
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border/80 p-4">
        <input
          type="checkbox"
          id="emailNotificationsEnabled"
          name="emailNotificationsEnabled"
          defaultChecked={emailNotificationsEnabled}
          value="on"
          className="mt-1 h-4 w-4 rounded border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div>
          <Label htmlFor="emailNotificationsEnabled">Powiadomienia e-mail</Label>
          <p className="text-xs text-muted-foreground">
            Przypomnienia o terminach, rezerwacjach i liście oczekujących.
          </p>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        Zapisz zmiany
      </Button>
    </form>
  );
}
