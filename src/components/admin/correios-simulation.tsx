"use client";

import { useState, type FormEvent } from "react";

type SimulationResult = {
  quotes: { code: string; name: string; priceCents: number; deliveryDays: number }[];
  unavailableServices: string[];
};

const formatMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const requestError = "Não foi possível consultar os Correios.";
const postalFields = [
  { name: "originPostalCode", label: "CEP de origem", value: "87525-000" },
  { name: "destinationPostalCode", label: "CEP de destino", value: "01001-000" },
];
const packageFields = [
  { name: "weightGrams", label: "Peso (g)", value: 500, max: 30000 },
  { name: "lengthCm", label: "Comprimento (cm)", value: 25, max: 100 },
  { name: "widthCm", label: "Largura (cm)", value: 15, max: 100 },
  { name: "heightCm", label: "Altura (cm)", value: 10, max: 100 },
];
const inputClass = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink";

export function CorreiosSimulation() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function clearResult() {
    setResult(null);
    setError("");
  }

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    clearResult();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/fretes/correios/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originPostalCode: String(values.get("originPostalCode")).replace(/\D/g, ""),
          destinationPostalCode: String(values.get("destinationPostalCode")).replace(/\D/g, ""),
          weightGrams: Number(values.get("weightGrams")),
          lengthCm: Number(values.get("lengthCm")),
          widthCm: Number(values.get("widthCm")),
          heightCm: Number(values.get("heightCm")),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.data?.quotes) || !Array.isArray(payload?.data?.unavailableServices)) {
        setError(typeof payload?.error === "string" ? payload.error : requestError);
        return;
      }
      setResult(payload.data);
    } catch {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h2 className="text-lg font-black">Correios · Cotação direta</h2>
      <p className="mt-2 text-sm text-muted">Consulte preço e prazo de entrega domiciliar para um pacote de teste. Modalidades com retirada aparecem como indisponíveis. A simulação não gera postagem nem confirma a aceitação da carga.</p>
      <form className="mt-5" onSubmit={simulate} onChange={clearResult}>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {postalFields.map(field => (
            <label key={field.name} className="grid gap-1 text-xs font-bold">
              {field.label}
              <input className={inputClass} name={field.name} defaultValue={field.value}
                inputMode="numeric" pattern="[0-9]{5}-?[0-9]{3}" title="Informe oito dígitos, com ou sem hífen" required />
            </label>
          ))}
          {packageFields.map(field => (
            <label key={field.name} className="grid gap-1 text-xs font-bold">
              {field.label}
              <input className={inputClass} name={field.name} type="number" defaultValue={field.value}
                min={1} max={field.max} step={1} required />
            </label>
          ))}
          <button type="submit" className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-3 lg:col-span-6">
            {busy ? "Cotando…" : "Simular frete nos Correios"}
          </button>
        </fieldset>
      </form>
      {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
      <div aria-live="polite">
        {result && <div className="mt-5 rounded-xl border border-line p-4">
          <h3 className="font-bold">Resultado da cotação</h3>
          {result.quotes.length > 0 ? <ul className="mt-2 divide-y divide-line text-sm">
            {result.quotes.map(quote => <li key={quote.code} className="flex flex-wrap justify-between gap-x-2 py-2">
              <span>{quote.name} · {quote.code}</span>
              <span>{formatMoney.format(quote.priceCents / 100)} · {quote.deliveryDays} {quote.deliveryDays === 1 ? "dia útil" : "dias úteis"}</span>
            </li>)}
          </ul> : <p className="mt-2 text-sm text-muted">Nenhuma modalidade retornou preço e prazo para este pacote.</p>}
          {result.unavailableServices.length > 0 && <div className="mt-3 text-sm text-muted">
            <p className="font-semibold">Serviços indisponíveis nesta cotação</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {result.unavailableServices.map(code => <li key={code}>{code}</li>)}
            </ul>
          </div>}
        </div>}
      </div>
    </section>
  );
}
