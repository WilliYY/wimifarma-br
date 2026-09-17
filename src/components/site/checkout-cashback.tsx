"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function CheckoutCashback({ subtotalCents, selectedCents, onSelect }: { subtotalCents: number; selectedCents: number; onSelect: (amount: number) => void }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/minha-conta/cashback", { cache: "no-store", signal });
      const payload = await response.json();
      const cents = Math.round(Number(payload?.data?.balance) * 100);
      if (!response.ok || !Number.isSafeInteger(cents)) throw new Error("Saldo indisponivel. Atualize ou entre novamente na sua conta.");
      setBalance(Math.max(0, cents));
    } catch (caught) {
      if (!signal?.aborted) { setBalance(null); setError(caught instanceof Error ? caught.message : "Saldo indisponivel."); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  const available = Math.min(balance ?? 0, subtotalCents);
  return <section className="mt-6 border-t border-line pt-5" aria-label="Usar cashback">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-black text-ink"><Wallet className="h-5 w-5 text-pharma-green" aria-hidden="true" />Seu cashback</h2><button aria-label="Atualizar saldo de cashback" title="Atualizar saldo" className="grid h-10 w-10 cursor-pointer place-items-center rounded-md text-muted hover:bg-surface-subtle disabled:opacity-50" disabled={loading} onClick={() => { onSelect(0); void refresh(); }} type="button"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
    {error ? <p className="mt-2 text-sm text-brand" role="alert">{error}</p> : <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 has-[:checked]:border-pharma-green">
      <input aria-label="Usar saldo de cashback" checked={selectedCents > 0} className="mt-1 h-5 w-5 shrink-0 accent-pharma-green" disabled={loading || available <= 0} onChange={(event) => onSelect(event.target.checked ? available : 0)} type="checkbox" />
      <span className="min-w-0"><strong className="block text-sm text-ink">{loading ? "Consultando saldo..." : available > 0 ? `Usar ${formatCurrency(available / 100)} neste pedido` : "Sem saldo disponivel"}</strong><span className="mt-1 block text-xs leading-5 text-muted">O valor fica reservado ao enviar o pedido e volta ao saldo em caso de cancelamento.</span></span>
    </label>}
    <Link className="mt-3 inline-block text-xs font-bold text-pharma-green underline" href="/cashback" target="_blank">Regras do cashback e bonus de avaliacao</Link>
  </section>;
}
