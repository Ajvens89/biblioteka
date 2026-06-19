"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EanScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function EanScanner({ open, onOpenChange, onScan }: EanScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"native" | "zxing" | null>(null);

  const finish = useCallback(
    (code: string) => {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (loopRef.current != null) cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
      onScan(code);
      toast.success(`Odczytano kod: ${code}`);
      onOpenChange(false);
    },
    [onScan, onOpenChange],
  );

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (loopRef.current != null) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopCamera();
    setMode(null);
    setError(null);
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;

    async function start() {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const formats = ["ean_13", "ean_8", "upc_a"] as const;
        const Detector = typeof window !== "undefined"
          ? (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            } }).BarcodeDetector
          : undefined;

        if (Detector) {
          setMode("native");
          const detector = new Detector({ formats: [...formats] });
          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const raw = codes[0]?.rawValue;
              if (raw) {
                finish(raw);
                return;
              }
            } catch {
              /* klatka bez kodu */
            }
            loopRef.current = requestAnimationFrame(tick);
          };
          loopRef.current = requestAnimationFrame(tick);
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        setMode("zxing");
        const reader = new BrowserMultiFormatReader();
        await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result, err) => {
            if (cancelled) return;
            if (result) finish(result.getText());
            if (err && !(err as { name?: string }).name?.includes("NotFound")) {
              /* ignoruj brak kodu w klatce */
            }
          },
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Nie udało się uruchomić kamery. Wpisz kod ręcznie.",
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera, finish]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cleanup(); onOpenChange(v); }}>
      <DialogContent className="max-w-md" onPointerDownOutside={cleanup} aria-describedby="ean-scanner-desc">
        <DialogHeader>
          <DialogTitle id="ean-scanner-title">Skanuj EAN / ISBN produktu</DialogTitle>
        </DialogHeader>
        <p id="ean-scanner-desc" className="text-sm text-muted-foreground">
          Kod z pudełka lub książki (tytuł w bibliotece). Nie skanuj tu naklejki egzemplarza — do tego służy{" "}
          <span className="whitespace-nowrap">/admin/egzemplarze</span>.
          Po odczycie skaner się zamknie.
          {mode && (
            <span className="block text-xs">Tryb: {mode === "native" ? "BarcodeDetector" : "ZXing"}</span>
          )}
        </p>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <video
            ref={videoRef}
            className="aspect-video w-full rounded-md bg-black object-cover"
            muted
            playsInline
            aria-label="Podgląd kamery do skanowania kodów kreskowych EAN"
            aria-describedby="ean-scanner-desc"
          />
        )}
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Anuluj
        </Button>
      </DialogContent>
    </Dialog>
  );
}
