"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LIBRARY_PARENT_ORIGINS } from "@/lib/embed-policy";

/** Only public layout dimensions and a route-change marker cross the trusted frame boundary. */
export function LibraryEmbedBridge() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const readyPublished = useRef(false);

  useEffect(() => {
    const navigated = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (window.parent === window) return;
    const content = document.getElementById("library-page-content");
    if (!content) return;
    let parentOrigin: string | null = null;
    let observer: ResizeObserver | null = null;
    let mutations: MutationObserver | null = null;
    let frame = 0;
    let previousHeight = 0;
    let previousContentReady = false;
    const publish = () => {
      if (!parentOrigin) return;
      const targetOrigin = parentOrigin;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(content.getBoundingClientRect().height);
        const contentReady = Boolean(content.querySelector("#main h1"));
        if (!Number.isFinite(height) || height < 100 || height > 40_000) return;
        if (height === previousHeight && contentReady === previousContentReady) return;
        previousHeight = height;
        previousContentReady = contentReady;
        window.parent.postMessage({ type: "zakatek-library:resize", height, contentReady }, targetOrigin);
      });
    };
    const startBridge = (origin: string) => {
      if (parentOrigin) return;
      parentOrigin = origin;
      document.documentElement.dataset.libraryEmbedded = "true";
      if (navigated) {
        window.parent.postMessage({ type: "zakatek-library:navigate" }, origin);
      } else if (!readyPublished.current) {
        readyPublished.current = true;
        window.parent.postMessage({ type: "zakatek-library:ready" }, origin);
      }
      observer = new ResizeObserver(publish);
      observer.observe(content);
      // Streamed pages can replace a loading view after the layout bridge has mounted.
      mutations = new MutationObserver(publish);
      mutations.observe(content, { childList: true, subtree: true });
      window.addEventListener("load", publish);
      publish();
    };
    const receiveViewport = (event: MessageEvent) => {
      if (event.source !== window.parent || !LIBRARY_PARENT_ORIGINS.some((origin) => origin === event.origin)) return;
      if (parentOrigin && event.origin !== parentOrigin) return;
      const data = event.data;
      if (!data || data.type !== "zakatek-library:viewport") return;
      if (!Number.isFinite(data.top) || !Number.isFinite(data.height)) return;
      if (data.top < 0 || data.top > 40_000 || data.height < 100 || data.height > 4_000) return;
      startBridge(event.origin);
      document.documentElement.style.setProperty("--library-visible-top", `${Math.round(data.top)}px`);
      document.documentElement.style.setProperty("--library-visible-height", `${Math.round(data.height)}px`);
    };
    // Install the trusted-message listener before requesting a parent viewport handshake.
    window.addEventListener("message", receiveViewport);
    try {
      const referrerOrigin = new URL(document.referrer).origin;
      if (LIBRARY_PARENT_ORIGINS.some((origin) => origin === referrerOrigin)) startBridge(referrerOrigin);
    } catch { /* A missing referrer is handled by the verified parent message below. */ }
    if (!parentOrigin) {
      for (const origin of LIBRARY_PARENT_ORIGINS) {
        window.parent.postMessage({ type: "zakatek-library:request-viewport" }, origin);
      }
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      mutations?.disconnect();
      window.removeEventListener("load", publish);
      window.removeEventListener("message", receiveViewport);
      delete document.documentElement.dataset.libraryEmbedded;
      document.documentElement.style.removeProperty("--library-visible-top");
      document.documentElement.style.removeProperty("--library-visible-height");
    };
  }, [pathname]);

  return null;
}
