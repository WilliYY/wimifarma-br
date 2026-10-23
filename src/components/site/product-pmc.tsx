import type { PublicPmcReference } from "@/features/products/cmed-reference";
import { formatCurrency } from "@/lib/utils";

export function ProductPmcPrice({ reference, strike = false }: { reference: PublicPmcReference; strike?: boolean }) {
  const edition = reference.publishedOn.split("-").reverse().join("/");
  return (
    <span title={`Referência comparativa: ${reference.column}, CMED ${edition}. Não é preço anterior da loja.`}>
      PMC CMED {strike ? <s>{formatCurrency(reference.amountCents / 100)}</s> : formatCurrency(reference.amountCents / 100)}
    </span>
  );
}

export function ProductPmcBadge({ percent, className = "" }: { percent: number; className?: string }) {
  return <span className={`inline-block max-w-32 rounded-lg bg-brand px-2 py-1.5 text-center text-[0.65rem] font-black leading-tight text-white shadow-sm ${className}`}>{percent}% abaixo do PMC</span>;
}

export function ProductPmcDetails({ reference }: { reference: PublicPmcReference }) {
  const edition = reference.publishedOn.split("-").reverse().join("/");
  return (
    <details className="mt-3 rounded-lg border border-line bg-white text-xs text-muted">
      <summary className="min-h-11 cursor-pointer rounded-lg px-3 py-3 font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Sobre o PMC e a comparação de preços</summary>
      <div className="space-y-3 border-t border-line px-3 py-3 leading-5">
        <p>PMC é o Preço Máximo ao Consumidor da tabela CMED. A referência comparativa usa a menor coluna PMC regular disponível nesta edição: <strong className="text-ink">{reference.column}</strong>. Não representa um preço anterior da Wimifarma.</p>
        <p>O teto aplicável depende da tributação e do estado de destino. A comparação não presume isenção de ICMS nem enquadramento em Área de Livre Comércio (ALC). O preço da loja é o valor em destaque; o desconto Pix depende da seleção no checkout.</p>
        <div className="max-h-64 overflow-y-auto rounded-md border border-line">
          <table className="w-full text-left">
            <caption className="bg-surface-subtle px-3 py-2 text-left font-semibold text-ink">Colunas oficiais CMED · edição {edition}</caption>
            <thead className="bg-surface-subtle text-ink"><tr><th className="px-3 py-2" scope="col">Tributação</th><th className="px-3 py-2 text-right" scope="col">PMC</th></tr></thead>
            <tbody>{reference.rates.map(rate => <tr className="border-t border-line" key={rate.label}><th className="px-3 py-2 font-normal" scope="row">{rate.label}</th><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rate.cents > 0 ? formatCurrency(rate.cents / 100) : "Não informado"}</td></tr>)}</tbody>
          </table>
        </div>
        <p>{reference.presentation} · {reference.laboratory} · Registro {reference.registration}.</p>
        <a className="inline-flex min-h-11 items-center rounded-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar a edição oficial da CMED</a>
      </div>
    </details>
  );
}
