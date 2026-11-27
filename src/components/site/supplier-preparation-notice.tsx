"use client";
import { useEffect, useState } from "react";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
export function SupplierPreparationNotice() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const estimate = getSupplierPreparationEstimate(now);
  return <div className="rounded-xl border border-line bg-white p-4 text-sm leading-6 text-ink" role="status"><strong>Preparação do pedido</strong><p>Você pode comprar a qualquer hora. O corte operacional é às 17h, no horário de Brasília: pagamentos confirmados a partir desse horário entram na próxima janela de preparo. O atendimento depende da disponibilidade confirmada pelo fornecedor. Precisamos de 1 dia para recebimento e conferência, com recebimentos de terça a sábado. Se o pagamento for confirmado agora, a previsão é até {estimate.readyDateLabel}, às 18h30. A previsão será atualizada na confirmação do pagamento. O fechamento da loja às 18h30 é separado do corte. O prazo de transporte começa após a preparação. Avisaremos quando estiver pronto.</p></div>;
}
