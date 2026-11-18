"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { blackFridayCampaign, isBlackFridayActive } from "@/features/offers/black-friday";

const BlackFridayContext = createContext(false);

export function BlackFridayProvider({ children, initialActive }: { children: ReactNode; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const now = Date.now();
      setActive(isBlackFridayActive(now));
      const nextBoundary = now < blackFridayCampaign.startsAt ? blackFridayCampaign.startsAt : blackFridayCampaign.endsAt;
      if (blackFridayCampaign.enabled && now < nextBoundary) {
        timer = setTimeout(update, Math.min(nextBoundary - now, 2_147_483_647));
      }
    };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <BlackFridayContext.Provider value={active}>{children}</BlackFridayContext.Provider>;
}

export function useBlackFridayCampaign() {
  return useContext(BlackFridayContext);
}
