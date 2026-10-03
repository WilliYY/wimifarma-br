"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getVisitSessionId, rememberVisitSessionId } from "@/features/analytics/visitor-client";

export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    async function track() {
      const sessionId = await getVisitSessionId(window);
      const payload = JSON.stringify({
        path: pathname || window.location.pathname || "/",
        referrer: document.referrer,
        sessionId,
      });

      const response = await fetch("/api/visitas", {
        body: payload,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        rememberVisitSessionId(window, result.visitorId);
      }
    }
    void track().catch(() => {
      // A visita nao deve interferir na navegacao do cliente.
    });
  }, [pathname]);

  return null;
}
