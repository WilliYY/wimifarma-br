"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type CheckoutPrescription = { id: string; submissionId: string; scope: string; expiresAt: string };

export function CheckoutPrescriptionUpload({ customer, scope, items, attachment, disabled, onUpload }: {
  customer: boolean; scope: string; items: { productId: string; quantity: number }[];
  attachment: CheckoutPrescription | null; disabled: boolean; onUpload: (value: CheckoutPrescription | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  async function upload(file: File | undefined) {
    if (!file || pending.current) return;
    onUpload(null); setError("");
    if (file.size > 3 * 1024 * 1024 || !["image/png", "image/jpeg", "application/pdf"].includes(file.type)) { setError("Envie PNG, JPEG ou PDF de até 3 MB."); return; }
    pending.current = true; setBusy(true);
    const submissionId = crypto.randomUUID();
    try {
      const response = await fetch("/api/minha-conta/receitas", { method: "POST", headers: { "Content-Type": file.type, "X-Checkout-Request-Id": submissionId, "X-Prescription-Cart": JSON.stringify(items) }, body: file });
      const payload = await response.json();
      if (!response.ok || !payload.data?.id) throw new Error(payload.error || "Não foi possível enviar a receita.");
      if (currentScope.current === scope) onUpload({ id: payload.data.id, expiresAt: payload.data.expiresAt, submissionId, scope });
    } catch (error) { if (currentScope.current === scope) setError(error instanceof Error ? error.message : "Não foi possível enviar a receita."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section aria-label="Receita do antimicrobiano" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-bold">Receita do antimicrobiano</p>
    <p className="mt-2">Envie a foto legível ou o PDF original para pré-análise do farmacêutico. O envio e o pagamento não aprovam a receita nem liberam a dispensação.</p>
    <p className="mt-2">A receita física original deve ser recolhida conforme orientação da farmácia. Um PDF original eletrônico precisa de validação humana; uma foto não substitui o original. A farmácia orientará a retenção e a escrituração.</p>
    {customer ? <label className="mt-3 grid gap-2 font-semibold">PNG, JPEG ou PDF · até 3 MB
      <input type="file" accept="image/png,image/jpeg,application/pdf" disabled={busy || disabled} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
    </label> : <Link href="/login?callbackUrl=%2Fcheckout" className="mt-3 inline-block font-bold underline">Entre na sua conta para enviar a receita</Link>}
    <p aria-live="polite" className="mt-2">{busy ? "Enviando com segurança..." : attachment?.scope === scope ? "Receita recebida para pré-análise. Nenhuma aprovação automática." : "Anexe a receita antes de confirmar o pedido."}</p>
    {error && <p role="alert" className="mt-2 font-semibold text-red-700">{error}</p>}
    <p className="mt-2 text-xs">Acesso restrito à administração. Anexos não utilizados deixam de ser aceitos após 24 horas e aguardam a limpeza operacional; receitas vinculadas ao pedido são preservadas para cumprimento das obrigações legais. <Link href="/privacidade" className="underline">Privacidade</Link></p>
  </section>;
}
