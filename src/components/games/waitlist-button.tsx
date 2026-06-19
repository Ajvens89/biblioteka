"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { joinWaitlistAction, leaveWaitlistAction } from "@/lib/actions/waitlist";
import { Button } from "@/components/ui/button";

type Props = {
  gameId: string;
  available: number;
  initialStatus: { position: number; status: string } | null;
  loginHref: string;
  isLoggedIn: boolean;
};

export function WaitlistButton({ gameId, available, initialStatus, loginHref, isLoggedIn }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (available > 0) return null;

  if (!isLoggedIn) {
    return (
      <p className="text-body text-muted-foreground">
        <a href={loginHref} className="font-semibold text-primary underline-offset-2 hover:underline">
          Zaloguj się
        </a>
        , aby dołączyć do listy oczekujących.
      </p>
    );
  }

  const onList = Boolean(initialStatus);

  const toggle = () =>
    start(async () => {
      const result = onList
        ? await leaveWaitlistAction(gameId)
        : await joinWaitlistAction(gameId);
      if (result.success) {
        toast.success(result.message ?? (onList ? "Usunięto z kolejki." : "Dodano do kolejki."));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={onList ? "outline" : "default"}
        className="min-h-11"
        disabled={pending}
        onClick={toggle}
        data-testid="waitlist-button"
      >
        {onList ? (
          <>
            <BellOff className="h-4 w-4" aria-hidden />
            Opuść listę oczekujących
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" aria-hidden />
            Powiadom, gdy dostępna
          </>
        )}
      </Button>
      {onList && initialStatus && (
        <p className="text-small text-muted-foreground" role="status">
          Twoja pozycja: <strong>{initialStatus.position}</strong>
          {initialStatus.status === "NOTIFIED" && " · Otrzymałeś powiadomienie — zarezerwuj szybko!"}
        </p>
      )}
    </div>
  );
}
