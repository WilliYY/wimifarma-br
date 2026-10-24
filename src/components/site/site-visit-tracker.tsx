"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { VISIT_HEARTBEAT_MS } from "@/features/analytics/online-presence";
import { getVisitSessionId, rememberVisitSessionId } from "@/features/analytics/visitor-client";

export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let disposed = false;
    let registered = false;
    let inFlight = false;
    let controller: AbortController | undefined;
    async function track() {
      if (disposed || inFlight || document.visibilityState !== "visible" || !navigator.onLine) return;
      inFlight = true;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const sessionId = registered ? undefined : await getVisitSessionId(window);
        if (disposed || document.visibilityState !== "visible") return;
        controller = new AbortController();
        timeout = setTimeout(() => controller?.abort(), 10_000);
        const response = await fetch("/api/visitas", {
          body: JSON.stringify(registered ? { type: "heartbeat" } : {
            path: pathname || window.location.pathname || "/", referrer: document.referrer, sessionId,
          }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        if (response.ok && !registered) {
          const result = await response.json();
          rememberVisitSessionId(window, result.visitorId);
          registered = true;
        }
      } catch {
        // Analytics must not interfere with shopping. Retry on the next scheduled signal.
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
        inFlight = false;
      }
    }
    const refresh = () => { void track(); };
    const timer = setInterval(refresh, VISIT_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    refresh();
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [pathname]);

  return null;
}
