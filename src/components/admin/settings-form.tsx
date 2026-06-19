"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/lib/actions/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { AppSettingsMap } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const labels: Record<keyof typeof DEFAULT_SETTINGS, string> = {
  maxActiveReservations: "Maks. aktywnych rezerwacji",
  defaultLoanDays: "Domyślny czas wypożyczenia (dni)",
  reservationValidityDays: "Ważność rezerwacji (dni)",
  maxLoanExtensions: "Maks. przedłużeń",
  waitlistValidityDays: "Ważność wpisu na liście oczekujących (dni)",
  waitlistNotifyHours: "Czas na rezerwację po powiadomieniu (godz.)",
  contactEmail: "E-mail kontaktowy",
  contactPhone: "Telefon",
  foundationAddress: "Adres fundacji",
  termsText: "Regulamin",
};

export function SettingsForm({ settings }: { settings: AppSettingsMap }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="max-w-xl space-y-4"
      action={(fd) =>
        start(async () => {
          const r = await saveSettingsAction(fd);
          if (r.success) toast.success("Zapisano ustawienia.");
          else toast.error(r.error);
        })
      }
    >
      {(Object.keys(DEFAULT_SETTINGS) as Array<keyof typeof DEFAULT_SETTINGS>).map((key) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{labels[key]}</Label>
          {key === "termsText" ? (
            <Textarea id={key} name={key} rows={8} defaultValue={settings[key]} />
          ) : (
            <Input id={key} name={key} defaultValue={settings[key]} />
          )}
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        Zapisz ustawienia
      </Button>
    </form>
  );
}
