"use client";

import { useState, type FormEvent } from "react";
import type { FrenetQuote } from "@/features/shipping/frenet";

type OriginResult = { city: string; postalCode: string; available: boolean; quotes: FrenetQuote[] };
const formatMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fields = [
  { name: "postalCode", label: "CEP de destino", value: "01001-000", type: "text", step: undefined },
  { name: "weightGrams", label: "Peso (g)", value: "500", type: "number", step: "1" },
  { name: "lengthCm", label: "Comprimento (cm)", value: "25", type: "number", step: "0.1" },
  { name: "widthCm", label: "Largura (cm)", value: "15", type: "number", step: "0.1" },
  { name: "heightCm", label: "Altura (cm)", value: "10", type: "number", step: "0.1" },
  { name: "invoiceValue", label: "Valor do pacote (R$)", value: "50", type: "number", step: "0.01" },
];

export function FrenetSimulation() {
  const [results, setResults] = useState<OriginResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setResults([]);
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/fretes/frenet/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postalCode: String(values.get("postalCode")).replace(/\D/g, ""),
          weightGrams: Number(values.get("weightGrams")),
          lengthCm: Number(values.get("lengthCm")),
          widthCm: Number(values.get("widthCm")),
          heightCm: Number(values.get("heightCm")),
          invoiceValueCents: Math.round(Number(values.get("invoiceValue")) * 100),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.data)) {
        setError(typeof payload?.error === "string" ? payload.error : "Não foi possível cotar pela Frenet.");
        return;
      }
      setResults(payload.data);
    } catch {
      setError("Não foi possível cotar pela Frenet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h2 className="text-lg font-black">Frenet · Ivaté e Douradina</h2>
      <p className="mt-2 text-sm text-muted">Compare pré-cotações do mesmo pacote. Confirme o valor da etiqueta, a aceitação da carga e a postagem.</p>
      <form className="mt-5" onSubmit={simulate} onChange={() => { setResults([]); setError(""); }}>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map(field => (
            <label key={field.name} className="grid gap-1 text-xs font-bold">
              {field.label}
              <input className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
                name={field.name} type={field.type} step={field.step} defaultValue={field.value}
                inputMode={field.type === "text" ? "numeric" : undefined} required />
            </label>
          ))}
          <button className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-3 lg:col-span-6">
            {busy ? "Cotando…" : "Comparar fretes Frenet"}
          </button>
        </fieldset>
      </form>
      {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
      {results.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-live="polite">
        {results.map(origin => <div key={origin.postalCode} className="rounded-xl border border-line p-4">
          <h3 className="font-bold">{origin.city}</h3>
          {origin.quotes.length ? <ul className="mt-2 divide-y divide-line text-sm">
            {origin.quotes.map(quote => <li key={quote.serviceId} className="flex flex-wrap justify-between gap-x-2 py-2">
              <span>{quote.carrier} · {quote.service}{!quote.allowBuyLabel && <small className="block text-muted">Etiqueta indisponível na cotação</small>}</span>
              <span>{formatMoney.format(quote.priceCents / 100)} · {quote.deliveryDays} dias úteis</span>
            </li>)}
          </ul> : <p className="mt-2 text-sm text-muted">
            {origin.available ? "Nenhuma modalidade retornada para o trecho." : "Consulta indisponível para esta origem."}
          </p>}
        </div>)}
      </div>}
    </section>
  );
}
