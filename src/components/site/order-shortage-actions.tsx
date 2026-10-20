"use client";

import { useRef, useState } from "react";
import type { ItemShortageSummary } from "@/features/store-credit/contracts";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function OrderShortageActions({ orderId, shortages, onChanged, readOnly = false }: { orderId: string; shortages: ItemShortageSummary[]; onChanged?: () => void; readOnly?: boolean }) {
  const [pending, setPending] = useState<string | null>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, ItemShortageSummary>>({});
  const [error, setError] = useState("");
  const sending = useRef(false);
  async function decide(shortage: ItemShortageSummary, decision: "ACCEPT_CREDIT" | "REQUEST_REFUND") {
    if (sending.current || (decision === "ACCEPT_CREDIT" && !consents[shortage.id])) return;
    sending.current = true; setPending(shortage.id); setError("");
    try {
      const response = await fetch(`/api/minha-conta/pedidos/${orderId}/faltas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shortageId: shortage.id, version: shortage.version, decision, ...(decision === "ACCEPT_CREDIT" ? { consent: true } : {}) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Não foi possível registrar sua escolha. Atualize o pedido antes de tentar novamente.");
      setDecisions(current => ({ ...current, [shortage.id]: payload.data }));
      onChanged?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível registrar sua escolha. Atualize o pedido."); }
    finally { sending.current = false; setPending(null); }
  }
  if (!shortages.length) return null;
  return <section aria-label="Itens indisponíveis" className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
    <h3 className="font-black">Itens indisponíveis na distribuidora</h3>
    {shortages.map(original => {
      const shortage = decisions[original.id] && decisions[original.id].version >= original.version ? decisions[original.id] : original;
      return <div className="space-y-2 border-t border-amber-200 pt-3" key={shortage.id}>
        <p className="break-words font-bold">{shortage.quantity} × {shortage.productName}</p>
        {(shortage.status === "PROPOSED" || shortage.status === "CREDIT_ACCEPTED") && <>
          <p>{shortage.status === "CREDIT_ACCEPTED" ? "Crédito de compra" : "Crédito se você aceitar"}: {money(shortage.cashPaidCents + shortage.storeCreditReturnCents)}{shortage.storeCreditReturnCents > 0 ? `, incluindo ${money(shortage.storeCreditReturnCents)} ${shortage.status === "CREDIT_ACCEPTED" ? "devolvidos" : "a devolver"} ao saldo original` : ""}.</p>
          {shortage.cashbackReturnCents > 0 && <p>Cashback {shortage.status === "CREDIT_ACCEPTED" ? "devolvido" : "a devolver ao aceitar crédito"}: {money(shortage.cashbackReturnCents)}.</p>}
          {shortage.wimicoinsReturnPoints > 0 && <p>WimiCoins {shortage.status === "CREDIT_ACCEPTED" ? "devolvidos" : "a devolver ao aceitar crédito"}: {shortage.wimicoinsReturnPoints} pontos.</p>}
        </>}
        {shortage.status === "PROPOSED" && !readOnly && <>
          <p>Você escolhe entre crédito para uma próxima compra ou solicitar reembolso.</p>
          <label className="flex items-start gap-2 leading-6"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={Boolean(consents[shortage.id])} onChange={event => setConsents(current => ({ ...current, [shortage.id]: event.target.checked }))} disabled={pending !== null} />Aceito receber crédito de compra para estas unidades indisponíveis.</label>
          <div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-xl bg-brand px-4 py-2 font-bold text-white disabled:opacity-50" type="button" disabled={pending !== null || !consents[shortage.id]} onClick={() => void decide(shortage, "ACCEPT_CREDIT")}>Aceitar crédito</button><button className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 font-bold disabled:opacity-50" type="button" disabled={pending !== null} onClick={() => void decide(shortage, "REQUEST_REFUND")}>Solicitar reembolso</button></div>
        </>}
        {shortage.status === "PROPOSED" && readOnly && <p>Aguardando escolha do cliente.</p>}
        {shortage.status === "CREDIT_ACCEPTED" && <p role="status">Crédito aceito para {shortage.quantity} unidade(s). {shortage.creditState === "ISSUED" ? "Saldo disponível na conta." : "Confira a situação do crédito abaixo."}</p>}
        {shortage.status === "REFUND_REQUESTED" && <p role="status">Reembolso solicitado. A equipe acompanha a devolução pelo meio de pagamento.</p>}
        {shortage.status === "VOIDED" && <p>Proposta encerrada.</p>}
        {shortage.creditState === "REVIEW" && <p className="font-bold">Crédito em conferência. Fale com a equipe para acompanhar.</p>}
        {shortage.creditState === "REVERSED" && <p className="font-bold">Crédito revisto após atualização financeira do pedido. Consulte o extrato e a equipe.</p>}
      </div>;
    })}
    {error && <p role="alert" className="text-red-800">{error}</p>}
  </section>;
}
