"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const EanScannerDynamic = dynamic(
  () => import("@/components/barcode/ean-scanner").then((m) => m.EanScanner),
  { ssr: false, loading: () => null },
);

type Props = ComponentProps<typeof EanScannerDynamic>;

export function EanScannerLazy(props: Props) {
  return <EanScannerDynamic {...props} />;
}
