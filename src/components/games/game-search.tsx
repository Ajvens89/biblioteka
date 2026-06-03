"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function GameSearch({ defaultValue = "", action = "/katalog" }: { defaultValue?: string; action?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultValue || searchParams.get("q") || "");

  const push = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      params.delete("page");
      router.push(`${action}?${params.toString()}`);
    },
    [router, searchParams, action],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get("q") || "";
      if (q !== current) push(q);
    }, 400);
    return () => clearTimeout(t);
  }, [q, push, searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-10"
        placeholder="Szukaj po tytule, opisie lub tagach…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
}
