"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LIBRARY_PARENT_ORIGINS } from "@/lib/embed-policy";

/** Only public layout dimensions and a route-change marker cross the trusted frame boundary. */
export function LibraryEmbedBridge() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const navigated = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (window.parent === window) return;
    let parentOrigin: string;
    try {
      parentOrigin = new URL(document.referrer).origin;
    } catch {
      return;
    }
    if (!LIBRARY_PARENT_ORIGINS.some((origin) => origin === parentOrigin)) return;

    const content = document.getElementById("library-page-content");
    if (!content) return;
    document.documentElement.dataset.libraryEmbedded = "true";
    if (navigated) {
      window.parent.postMessage({ type: "zakatek-library:navigate" }, parentOrigin);
    }
    const receiveViewport = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin) return;
      const data = event.data;
      if (!data || data.type !== "zakatek-library:viewport") return;
      if (!Number.isFinite(data.top) || !Number.isFinite(data.height)) return;
      if (data.top < 0 || data.top > 40_000 || data.height < 100 || data.height > 4_000) return;
      document.documentElement.style.setProperty("--library-visible-top", `${Math.round(data.top)}px`);
      document.documentElement.style.setProperty("--library-visible-height", `${Math.round(data.height)}px`);
    };
    window.addEventListener("message", receiveViewport);
    let frame = 0;
    let previousHeight = 0;
    const publish = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(content.getBoundingClientRect().height);
        if (!Number.isFinite(height) || height < 100 || height > 40_000 || height === previousHeight) return;
        previousHeight = height;
        window.parent.postMessage({ type: "zakatek-library:resize", height }, parentOrigin);
      });
    };
    const observer = new ResizeObserver(publish);
    observer.observe(content);
    window.addEventListener("load", publish);
    publish();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("load", publish);
      window.removeEventListener("message", receiveViewport);
      delete document.documentElement.dataset.libraryEmbedded;
      document.documentElement.style.removeProperty("--library-visible-top");
      document.documentElement.style.removeProperty("--library-visible-height");
    };
  }, [pathname]);

  return null;
}
