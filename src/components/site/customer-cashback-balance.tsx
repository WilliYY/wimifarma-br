"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export function CustomerCashbackBalance() {
  const [balance, setBalance] = useState<string | null>(null);
  useEffect(() => {
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
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return <span className="block truncate text-[11px] font-bold leading-4 text-emerald-800" title="Cashback liberado">Cashback {balance === null ? "..." : formatCurrency(Number(balance))}</span>;
}
