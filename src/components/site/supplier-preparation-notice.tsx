"use client";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
export function SupplierPreparationNotice() {
  const estimate = getSupplierPreparationEstimate(new Date());
  return <div className="rounded-xl border border-line bg-white p-4 text-sm leading-6 text-ink" role="status"><strong>Preparação do pedido</strong><p>Precisamos de 1 dia de preparação. Para esta compra, a previsão é até {estimate.readyDateLabel}, às 18h30, considerando o calendário de recebimentos, que não ocorre aos domingos e às segundas. O prazo de transporte começa após a preparação. Avisaremos quando estiver pronto.</p></div>;
}
