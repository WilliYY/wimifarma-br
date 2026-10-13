"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useClubSummary } from "@/hooks/use-club-summary";

const CustomerCashbackContext = createContext<string | null>(null);
const CustomerClubContext = createContext<number | null>(null);

export function CustomerCashbackProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [balance, setBalance] = useState<string | null>(null);
  const { summary } = useClubSummary(enabled);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (document.hidden || loading) return;
      loading = true;
      try {
        const response = await fetch("/api/minha-conta/cashback", { cache: "no-store", signal: controller.signal });
        if (!response.ok) { setBalance(null); return; }
        const payload = await response.json();
        if (!controller.signal.aborted) setBalance(payload.data.balance);
      } catch { /* O saldo indisponivel nao deve aparecer como zero. */ }
      finally { loading = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("wimifarma:cashback-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("wimifarma:cashback-updated", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [enabled]);
  return <CustomerClubContext.Provider value={enabled && summary ? summary.balancePoints : null}><CustomerCashbackContext.Provider value={enabled ? balance : null}>{children}</CustomerCashbackContext.Provider></CustomerClubContext.Provider>;
}

export function CustomerCashbackBalance() {
  const balance = useContext(CustomerCashbackContext);
  const points = useContext(CustomerClubContext);
  return <>
    <span className="block truncate text-[11px] font-bold leading-4 text-amber-800">
      WimiCoins{" "}
      <svg aria-hidden="true" focusable="false" viewBox="0 0 12 14" className="inline-block h-3 w-2.5 align-[-1px]">
        <path d="M4 1h4v1h2v2h1v6h-1v2H8v1H4v-1H2v-2H1V4h1V2h2Z" fill="var(--color-amber-400)" stroke="var(--color-amber-700)" strokeWidth="0.8" />
        <path d="M4 3H3v2H2v4h1v2h1" fill="none" stroke="var(--color-amber-200)" />
        <path d="M6 4h1v6H6Z" fill="var(--color-amber-700)" />
      </svg>{" "}
      {points === null ? "..." : points.toLocaleString("pt-BR")}
    </span>
    <span className="block truncate text-[11px] font-bold leading-4 text-emerald-800" title="Cashback liberado">Cashback {balance === null ? "..." : formatCurrency(Number(balance))}</span>
  </>;
}
