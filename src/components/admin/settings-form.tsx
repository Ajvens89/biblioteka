"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/lib/actions/settings";
import { CATALOG_SETTINGS_KEYS } from "@/lib/admin/catalog-navigation";
import type { AppSettingsMap } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const labels: Record<typeof CATALOG_SETTINGS_KEYS[number], string> = {
  contactEmail: "E-mail kontaktowy",
  contactPhone: "Telefon",
  foundationAddress: "Adres fundacji",
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
      {CATALOG_SETTINGS_KEYS.map((key) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{labels[key]}</Label>
          <Input id={key} name={key} defaultValue={settings[key]} />
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        Zapisz ustawienia
      </Button>
    </form>
  );
}
