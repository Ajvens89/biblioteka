"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  issueWalkInLoan,
  lookupCopyForCirculation,
  lookupUserForCirculation,
  returnLoanByCopyScan,
} from "@/lib/actions/loans";
import { EanScanner } from "@/components/barcode/ean-scanner";
import { ScannerButton } from "@/components/ui/scanner-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

type Mode = "issue" | "return";

type UserHit = { id: string; email: string; fullName: string | null; isBlocked: boolean };

type CopyHit = {
  id: string;
  inventoryNumber: string;
  barcode: string | null;
  status: string;
  gameTitle: string;
  activeLoan: { id: string; userName: string; dueAt: string } | null;
};

export function CirculationPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("return");
  const [pending, start] = useTransition();
  const [userQuery, setUserQuery] = useState("");
  const [copyQuery, setCopyQuery] = useState("");
  const [users, setUsers] = useState<UserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [copy, setCopy] = useState<CopyHit | null>(null);
  const [scannerTarget, setScannerTarget] = useState<"user" | "copy" | null>(null);

  const searchUser = () =>
    start(async () => {
      const result = await lookupUserForCirculation(userQuery);
      if (!result.success) {
        setUsers([]);
        setSelectedUser(null);
        toast.error(result.error);
        return;
      }
      setUsers(result.data?.users ?? []);
      if (result.data?.users.length === 1) setSelectedUser(result.data.users[0]!);
    });

  const searchCopy = () =>
    start(async () => {
      const result = await lookupCopyForCirculation(copyQuery);
      if (!result.success) {
        setCopy(null);
        toast.error(result.error);
        return;
      }
      setCopy(result.data?.copy ?? null);
    });

  const onScan = (code: string) => {
    if (scannerTarget === "user") {
      setUserQuery(code);
      start(async () => {
        const result = await lookupUserForCirculation(code);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setUsers(result.data?.users ?? []);
        setSelectedUser(result.data?.users[0] ?? null);
      });
    } else if (scannerTarget === "copy") {
      setCopyQuery(code);
      start(async () => {
        const result = await lookupCopyForCirculation(code);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setCopy(result.data?.copy ?? null);
      });
    }
    setScannerTarget(null);
  };

  const doIssue = () =>
    start(async () => {
      if (!selectedUser) {
        toast.error("Wybierz użytkownika.");
        return;
      }
      if (!copy) {
        toast.error("Zeskanuj egzemplarz.");
        return;
      }
      if (copy.status !== "AVAILABLE") {
        toast.error("Egzemplarz nie jest dostępny.");
        return;
      }
      const result = await issueWalkInLoan(selectedUser.id, copy.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Wydano grę.");
        setCopy(null);
        setCopyQuery("");
        router.refresh();
    });

  const doReturn = (options?: { markDamaged?: boolean; markRepair?: boolean }) =>
    start(async () => {
      if (!copyQuery.trim()) {
        toast.error("Zeskanuj egzemplarz.");
        return;
      }
      const result = await returnLoanByCopyScan(copyQuery.trim(), options);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Zwrot przyjęty.");
        setCopy(null);
        setCopyQuery("");
        router.refresh();
    });

  return (
    <div className="space-y-4" data-testid="circulation-panel">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "return" ? "default" : "outline"}
          onClick={() => setMode("return")}
          data-testid="circulation-mode-return"
        >
          Szybki zwrot
        </Button>
        <Button
          type="button"
          variant={mode === "issue" ? "default" : "outline"}
          onClick={() => setMode("issue")}
          data-testid="circulation-mode-issue"
        >
          Wydanie na miejscu
        </Button>
      </div>

      {mode === "issue" && (
        <SectionCard title="1. Użytkownik">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="E-mail lub imię"
                className="min-w-[200px] flex-1"
                data-testid="circulation-user-input"
                onKeyDown={(e) => e.key === "Enter" && searchUser()}
              />
              <ScannerButton
                onClick={() => setScannerTarget("user")}
                label="Skanuj"
              />
              <Button type="button" onClick={searchUser} disabled={pending}>
                Szukaj
              </Button>
            </div>
            {users.length > 1 && (
              <div className="space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                      selectedUser?.id === u.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedUser(u)}
                  >
                    {u.fullName ?? u.email}
                    <span className="block text-xs text-muted-foreground">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <p className="text-sm">
                Wybrany: <strong>{selectedUser.fullName ?? selectedUser.email}</strong>
                {selectedUser.isBlocked && (
                  <span className="ml-2 text-destructive">(zablokowany)</span>
                )}
              </p>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard title={mode === "issue" ? "2. Egzemplarz" : "Egzemplarz do zwrotu"}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={copyQuery}
              onChange={(e) => setCopyQuery(e.target.value)}
              placeholder="Nr inw. lub kod naklejki"
              className="min-w-[200px] flex-1"
              data-testid="circulation-copy-input"
              onKeyDown={(e) => e.key === "Enter" && (mode === "return" ? doReturn() : searchCopy())}
            />
            <ScannerButton onClick={() => setScannerTarget("copy")} label="Skanuj" />
            <Button type="button" onClick={searchCopy} disabled={pending}>
              Szukaj
            </Button>
          </div>

          {copy && (
            <div className="rounded-lg border p-3 text-sm space-y-2">
              <p className="font-semibold">{copy.gameTitle}</p>
              <p className="font-mono text-xs">{copy.inventoryNumber}</p>
              <StatusBadge kind="copy" status={copy.status as "AVAILABLE"} />
              {copy.activeLoan && (
                <p className="text-muted-foreground">
                  Wypożyczone: {copy.activeLoan.userName} · termin {formatDate(new Date(copy.activeLoan.dueAt))}
                </p>
              )}
            </div>
          )}

          {mode === "issue" ? (
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={pending || !selectedUser || !copy}
              data-testid="circulation-issue-submit"
              onClick={doIssue}
            >
              Wydaj grę
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="lg"
                disabled={pending}
                data-testid="circulation-return-submit"
                onClick={() => doReturn()}
              >
                Przyjmij zwrot
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => doReturn({ markDamaged: true })}
              >
                Zwrot — uszkodzone
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => doReturn({ markRepair: true })}
              >
                Zwrot — do naprawy
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      <EanScanner
        open={scannerTarget !== null}
        onOpenChange={(open) => !open && setScannerTarget(null)}
        onScan={onScan}
      />
    </div>
  );
}
