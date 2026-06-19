"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { Notification } from "@prisma/client";

type Props = {
  initialCount: number;
  initialItems: Notification[];
};

export function NotificationBell({ initialCount, initialItems }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.success) {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        setCount((c) => Math.max(0, c - 1));
      }
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.success) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setCount(0);
      }
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 px-0"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `Powiadomienia (${count} nieprzeczytanych)` : "Powiadomienia"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover shadow-lg"
          role="dialog"
          aria-label="Lista powiadomień"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Powiadomienia</span>
            {count > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline disabled:opacity-50"
                onClick={handleMarkAll}
                disabled={pending}
              >
                Oznacz wszystkie
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">Brak powiadomień</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-border/60 px-3 py-2 last:border-0 ${!n.isRead ? "bg-muted/40" : ""}`}
                >
                  {n.linkUrl ? (
                    <Link
                      href={n.linkUrl}
                      className="block text-sm hover:text-primary"
                      onClick={() => {
                        if (!n.isRead) handleMarkRead(n.id);
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium">{n.title}</span>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left text-sm"
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                    >
                      <span className="font-medium">{n.title}</span>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    </button>
                  )}
                  <time className="mt-1 block text-[10px] text-muted-foreground" dateTime={n.createdAt.toISOString()}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: pl })}
                  </time>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-border px-3 py-2">
            <Link
              href="/moje-konto?tab=powiadomienia"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Zobacz wszystkie
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
