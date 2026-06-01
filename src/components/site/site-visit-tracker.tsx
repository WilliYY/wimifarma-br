"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISIT_SESSION_KEY = "wimifarma_visit_session_id";

function createVisitSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `visit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitSessionId() {
  const stored = window.localStorage.getItem(VISIT_SESSION_KEY);

  if (stored) {
    return stored;
  }

  const sessionId = createVisitSessionId();
  window.localStorage.setItem(VISIT_SESSION_KEY, sessionId);

  return sessionId;
}

export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const sessionId = getVisitSessionId();
      const payload = JSON.stringify({
        path: pathname || window.location.pathname || "/",
        referrer: document.referrer,
        sessionId,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/visitas", blob);
        return;
      }

      void fetch("/api/visitas", {
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      });
    } catch {
      // A visita nao deve interferir na navegacao do cliente.
    }
  }, [pathname]);

  return null;
}
