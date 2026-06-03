"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UserRole } from "@prisma/client";
import { updateUserRole, toggleUserBlock } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function UserRoleButtons({
  profileId,
  currentRole,
  isBlocked,
}: {
  profileId: string;
  currentRole: UserRole;
  isBlocked: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const setRole = (role: "USER" | "LIBRARIAN" | "ADMIN") =>
    start(async () => {
      const r = await updateUserRole(profileId, role);
      if (r.success) {
        toast.success("Rola zaktualizowana.");
        router.refresh();
      } else toast.error(r.error);
    });

  const toggleBlock = () =>
    start(async () => {
      const r = await toggleUserBlock(profileId, !isBlocked);
      if (r.success) {
        toast.success(isBlocked ? "Odblokowano." : "Zablokowano.");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex flex-wrap gap-1">
      {currentRole !== "USER" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRole("USER")}>
          Użytkownik
        </Button>
      )}
      {currentRole !== "LIBRARIAN" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRole("LIBRARIAN")}>
          Bibliotekarz
        </Button>
      )}
      {currentRole !== "ADMIN" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRole("ADMIN")}>
          Admin
        </Button>
      )}
      <Button size="sm" variant="destructive" disabled={pending} onClick={toggleBlock}>
        {isBlocked ? "Odblokuj" : "Zablokuj"}
      </Button>
    </div>
  );
}
