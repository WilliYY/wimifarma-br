"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreCreditSummary } from "@/features/store-credit/contracts";
import { formatCurrency } from "@/lib/utils";

export function CheckoutStoreCredit({ capCents, selectedCents, onSelect }: { capCents: number; selectedCents: number; onSelect: (amount: number) => void }) {
  const [summary, setSummary] = useState<StoreCreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); onSelect(0);
    try {
      const response = await fetch("/api/minha-conta/creditos", { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (!response.ok || !Number.isSafeInteger(payload.data?.availableCents) || payload.data.availableCents < 0) throw new Error("Crédito indisponível. Atualize ou entre novamente na sua conta.");
      if (!controller.signal.aborted) setSummary(payload.data);
    } catch { if (!controller.signal.aborted) { setSummary(null); setError("Crédito indisponível. Atualize ou entre novamente na sua conta."); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [onSelect]);
  useEffect(() => { void refresh(); const update = () => void refresh(); window.addEventListener("wimifarma:store-credit-updated", update); return () => { request.current?.abort(); window.removeEventListener("wimifarma:store-credit-updated", update); }; }, [refresh]);
  const available = !loading && !error && !summary?.reviewRequired ? Math.max(0, Math.min(summary?.availableCents ?? 0, capCents)) : 0;
  useEffect(() => { if (selectedCents > available) onSelect(0); }, [available, onSelect, selectedCents]);
  return <section aria-label="Usar crédito de compra" className="mt-6 border-t border-line pt-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-black">Crédito de compra</h2><button type="button" disabled={loading} className="min-h-11 text-xs font-bold text-brand disabled:opacity-50" onClick={() => void refresh()}>Atualizar crédito</button></div>
    <p className="text-xs leading-5 text-muted">Saldo de itens indisponíveis aceitos como crédito, separado do cashback e dos WimiCoins.</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
    {summary?.reviewRequired && <p role="status" className="mt-2 text-sm text-amber-900">Crédito em conferência. Fale com a equipe para acompanhar.</p>}
    <label className="mt-3 flex items-start gap-3 rounded-xl border border-line p-4"><input aria-label="Usar saldo de crédito de compra" type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={selectedCents > 0} disabled={available <= 0} onChange={event => onSelect(event.target.checked ? available : 0)} /><span className="text-sm font-bold">{loading ? "Consultando crédito…" : available > 0 ? `Usar ${formatCurrency(available / 100)} neste pedido` : "Sem crédito disponível para este pedido"}</span></label>
    {selectedCents > 0 && <label className="mt-3 block text-xs font-bold">Valor do crédito em reais<input aria-label="Valor do crédito em reais" type="number" inputMode="decimal" min="0" max={available / 100} step="0.01" value={(selectedCents / 100).toFixed(2)} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-base" onChange={event => { const value = Math.round(Number(event.target.value) * 100); onSelect(Number.isSafeInteger(value) ? Math.max(0, Math.min(value, available)) : 0); }} /></label>}
  </section>;
}
