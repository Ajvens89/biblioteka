"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/utils";

type Props = {
  action: (prev: unknown, formData: FormData) => Promise<ActionResult>;
  fields: Array<{ name: string; label: string; type?: string }>;
  submitLabel: string;
  redirectPath?: string;
};

export function AuthForm({ action, fields, submitLabel, redirectPath }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4" data-testid="auth-form">
      {redirectPath && <input type="hidden" name="redirect" value={redirectPath} />}
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            required
            data-testid={f.name === "email" ? "login-email" : f.name === "password" ? "login-password" : undefined}
          />
        </div>
      ))}
      {state && !state.success && (
        <p className="text-sm text-destructive" data-testid="auth-error">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending} data-testid="login-submit">
        {pending ? "Proszę czekać…" : submitLabel}
      </Button>
    </form>
  );
}
