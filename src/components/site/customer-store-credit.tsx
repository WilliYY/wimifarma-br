"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreCreditSummary } from "@/features/store-credit/contracts";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const kinds = { ISSUE: "Crédito recebido", RESERVE: "Reservado no pedido", RETURN: "Devolução ao saldo", REVERSAL: "Revisão do crédito" };

export function CustomerStoreCredit({ customerId }: { customerId: string }) {
  const [summary, setSummary] = useState<StoreCreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/minha-conta/creditos", { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (!response.ok || !Number.isSafeInteger(payload.data?.balanceCents)) throw new Error("Não foi possível consultar os créditos. Atualize ou entre novamente na conta.");
      if (!controller.signal.aborted) setSummary(payload.data);
    } catch (caught) { if (!controller.signal.aborted) { setSummary(null); setError(caught instanceof Error ? caught.message : "Não foi possível consultar os créditos."); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { setSummary(null); void refresh(); const update = () => void refresh(); window.addEventListener("wimifarma:store-credit-updated", update); return () => { request.current?.abort(); window.removeEventListener("wimifarma:store-credit-updated", update); }; }, [customerId, refresh]);
  return <section aria-label="Créditos de compra" aria-busy={loading} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Créditos de compra</h2><button className="min-h-11 text-sm font-bold text-brand disabled:opacity-50" type="button" disabled={loading} onClick={() => void refresh()}>Atualizar créditos</button></div>
    <p className="mt-2 text-sm leading-6 text-muted">Valores de itens indisponíveis que você aceitou como crédito. Saldo separado do cashback e dos WimiCoins.</p>
    {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
    {summary && <><p className="mt-4 text-3xl font-black">{money(summary.balanceCents)}</p><p className="mt-1 text-xs text-muted">Disponível: {money(summary.availableCents)} · Reservado: {money(summary.reservedCents)}</p>
      {(summary.reviewRequired || summary.balanceCents < 0) && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Crédito em conferência ou com saldo a regularizar. Fale com a equipe para acompanhar.</p>}
      <h3 className="mt-5 font-bold">Extrato dos créditos</h3><ul className="mt-2 divide-y divide-line">{summary.transactions.map(transaction => <li key={transaction.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div className="min-w-0"><p className="font-bold">{kinds[transaction.kind]}</p><p className="break-words text-muted">{transaction.description}</p><p className="mt-1 text-xs text-muted">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(transaction.createdAt))}</p></div><strong>{money(transaction.amountCents)}</strong></li>)}</ul>{!summary.transactions.length && <p className="mt-3 text-sm text-muted">Sem movimentações de crédito de compra.</p>}</>}
  </section>;
}
