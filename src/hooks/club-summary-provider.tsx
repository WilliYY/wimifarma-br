"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ClubSummaryContext, createClubSummaryStore } from "@/hooks/use-club-summary";

export function ClubSummaryProvider({ children, ownerKey }: { children: ReactNode; ownerKey: string | null }) {
  const [store] = useState(() => createClubSummaryStore(true));
  const router = useRouter();
  useEffect(() => {
    let controller: AbortController | undefined;
    let validation: Promise<void> | undefined;
    let version = 0;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("next-auth");
    const suspend = () => {
      version++;
      controller?.abort();
      validation = undefined;
      store.suspend();
    };
    const revalidate = (): Promise<void> => {
      if (validation) return validation;
      suspend();
      if (document.visibilityState !== "visible" || !store.hasSubscribers()) return Promise.resolve();
      const currentVersion = version;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = window.setTimeout(() => requestController.abort(), 5_000);
      validation = (async () => {
        try {
          const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin", signal: requestController.signal });
          if (!response.ok) throw new Error("unavailable");
          const session = await response.json();
          let freshKey: string | null = null;
          if (session?.user?.id && session.expires && Date.parse(session.expires) > Date.now()) {
            const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`miauby:${session.user.id}`));
            freshKey = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("").slice(0, 24);
          }
          if (version !== currentVersion || requestController.signal.aborted) return;
          if (freshKey !== ownerKey) {
            router.refresh();
            return;
          }
          store.resume();
        } catch {
          if (version === currentVersion) store.sessionUnavailable();
        } finally {
          window.clearTimeout(timeout);
          if (version === currentVersion) validation = undefined;
        }
      })();
      return validation;
    };
    const refresh = () => { void revalidate(); };
    const visibilityChanged = () => { if (document.visibilityState === "visible") refresh(); else suspend(); };
    const sessionChanged = (event: MessageEvent) => {
      if (event.data?.event !== "session") return;
      suspend();
      refresh();
    };
    store.setSessionRevalidator(revalidate);
    channel?.addEventListener("message", sessionChanged);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("pagehide", suspend);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      suspend();
      channel?.close();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("pagehide", suspend);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [ownerKey, router, store]);
  return <ClubSummaryContext.Provider value={store}>{children}</ClubSummaryContext.Provider>;
}
