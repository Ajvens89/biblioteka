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
}: {
  fullName: string;
  phone: string;
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
      <Button type="submit" disabled={pending}>
        Zapisz zmiany
      </Button>
    </form>
  );
}
