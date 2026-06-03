"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function CopyQr({ inventoryNumber }: { inventoryNumber: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/admin/egzemplarze?scan=${encodeURIComponent(inventoryNumber)}`;
    QRCode.toDataURL(url, { width: 80, margin: 1 }).then(setSrc);
  }, [inventoryNumber]);

  if (!src) return <span className="text-xs text-muted-foreground">…</span>;
  return <img src={src} alt={`QR ${inventoryNumber}`} width={80} height={80} />;
}
