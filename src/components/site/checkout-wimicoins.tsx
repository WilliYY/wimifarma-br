"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Coins, RefreshCw } from "lucide-react";
import { useClubSummary } from "@/hooks/use-club-summary";
import { formatCurrency } from "@/lib/utils";

export function CheckoutWimiCoins({ capPoints, selectedPoints, onSelect }: { capPoints: number; selectedPoints: number; onSelect: (amount: number) => void }) {
  const { summary, guest, loading, error, refresh } = useClubSummary();
  const available = summary?.member ? Math.max(0, Math.min(summary.balancePoints, capPoints)) : 0;
  useEffect(() => {
    if (selectedPoints > 0 && (loading || error || selectedPoints > available)) onSelect(0);
  }, [available, error, loading, onSelect, selectedPoints]);
  return <section aria-label="Usar WimiCoins" className="mt-6 min-w-0 border-t border-line pt-5">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-black text-ink"><Coins aria-hidden="true" className="h-5 w-5 text-amber-700" />Seus WimiCoins</h2><button aria-label="Atualizar saldo de WimiCoins" className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-subtle disabled:opacity-50" disabled={loading} onClick={() => { onSelect(0); void refresh(); }} type="button"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} /></button></div>
    <p className="mt-1 text-xs leading-5 text-muted">100 WimiCoins = R$ 1. Você pode usar junto com o cashback, em itens sem receita e fora da Farmácia Popular.</p>
    {loading ? <p role="status" className="mt-3 text-sm text-muted">Consultando WimiCoins…</p> : error ? <p role="alert" className="mt-3 text-sm text-brand">{error}</p> : summary?.member ? <><p className="mt-2 text-xs text-muted">Saldo: {summary.balancePoints.toLocaleString("pt-BR")} WimiCoins · {formatCurrency(summary.balancePoints / 100)}</p>{available > 0 ? <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4"><input aria-label="Usar saldo de WimiCoins" checked={selectedPoints > 0} className="mt-1 h-5 w-5 shrink-0 accent-brand" onChange={event => onSelect(event.target.checked ? available : 0)} type="checkbox" /><span className="min-w-0"><strong className="block text-sm text-ink">Usar {(selectedPoints > 0 ? selectedPoints : available).toLocaleString("pt-BR")} WimiCoins ({formatCurrency((selectedPoints > 0 ? selectedPoints : available) / 100)})</strong><span className="mt-1 block text-xs leading-5 text-muted">Reservados ao enviar o pedido e devolvidos em caso de cancelamento.</span></span></label> : <p className="mt-2 text-xs text-muted">Sem WimiCoins disponíveis para este pedido.</p>}</> : <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-brand underline" href={guest ? "/login?callbackUrl=%2Fcheckout" : "/minha-conta"}>Assinar o Club grátis para usar WimiCoins</Link>}
  </section>;
}
