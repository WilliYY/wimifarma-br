"use client";

import { useState } from "react";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCustomerMessage, type CustomerMessageData, type CustomerMessageEvent } from "@/features/communications/customer-messages";

const events: { value: CustomerMessageEvent; label: string }[] = [
  { value: "CART_ABANDONED", label: "Carrinho aguardando" },
  { value: "ORDER_RECEIVED", label: "Pedido recebido" },
  { value: "PIX_CREATED", label: "Pix criado" },
  { value: "PAYMENT_REMINDER", label: "Lembrete de pagamento" },
  { value: "PAYMENT_CONFIRMED", label: "Pagamento confirmado" },
  { value: "POST_SALE", label: "Pós-venda e avaliação" },
];

function sampleMessage(event: CustomerMessageEvent) {
  const completed = event === "POST_SALE";
  const paid = completed || event === "PAYMENT_CONFIRMED";
  const sample: CustomerMessageData = {
    event,
    environment: "TEST",
    firstName: "Cliente Exemplo",
    orderNumber: event === "CART_ABANDONED" ? undefined : "WBR-FICTICIO-001",
    items: [
      { name: "Sabonete fictício para demonstração", quantity: 2, unitPriceCents: 1500, totalCents: 3000 },
      { name: "Shampoo fictício para demonstração", quantity: 1, unitPriceCents: 2000, totalCents: 2000 },
    ],
    subtotalCents: 5000,
    deliveryFeeCents: 790,
    discounts: [{ label: "Cupom fictício", amountCents: 500 }, { label: "Cashback utilizado fictício", amountCents: 500 }],
    totalCents: 4790,
    fulfillmentMethod: "DELIVERY",
    orderStatus: completed ? "COMPLETED" : "PENDING",
    paymentStatus: paid ? "PAID" : "PENDING",
    cashback: completed ? { earnedCents: 80, balanceCents: 280 } : { pendingCents: 80 },
    paymentPage: event === "PIX_CREATED" ? { url: "https://loja.example/checkout/pagamento/fixture-order", orderId: "fixture-order", authorizedForRecipient: true } : undefined,
  };
  return buildCustomerMessage(sample, { includeItems: true, recipientVerified: true, trustedOrigin: "https://loja.example" })!;
}

export function CustomerMessagePreview() {
  const [event, setEvent] = useState<CustomerMessageEvent>("ORDER_RECEIVED");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [notice, setNotice] = useState("");
  const message = sampleMessage(event);
  const text = channel === "email" ? message.email.text : message.whatsappText;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(channel === "email" ? `Assunto: ${message.email.subject}\n\n${text}` : text);
      setNotice("Texto fictício copiado. Nenhuma mensagem foi enviada.");
    } catch {
      setNotice("Não foi possível copiar. Selecione o texto da prévia manualmente.");
    }
  }

  return (
    <section aria-labelledby="customer-message-preview-title" className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Modelos para clientes</p>
          <h3 className="mt-1 text-lg font-black text-ink" id="customer-message-preview-title">Prévia — envio ao cliente ainda não conectado</h3>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">Dados fictícios</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">Veja como a Miauby poderá acompanhar cada etapa da compra. Os alertas atuais ao WhatsApp do proprietário continuam em um canal separado. Esta prévia não configura nem envia mensagens.</p>
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-bold text-ink">
          Etapa da compra
          <select className="h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" onChange={change => { setEvent(change.target.value as CustomerMessageEvent); setNotice(""); }} value={event}>
            {events.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-bold text-ink">
          Canal da prévia
          <select className="h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" onChange={change => { setChannel(change.target.value as "whatsapp" | "email"); setNotice(""); }} value={channel}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </select>
        </label>
      </div>
      <div className="mt-5 min-w-0 overflow-hidden rounded-xl border border-line">
        <div className="flex min-w-0 items-center gap-2 border-b border-line bg-brand-soft px-4 py-3 text-sm font-bold text-ink">
          {channel === "email" ? <Mail aria-hidden="true" className="h-4 w-4 shrink-0" /> : <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />}
          {channel === "email" ? "Prévia de e-mail" : "Prévia de WhatsApp"}
        </div>
        {channel === "email" && <p className="border-b border-line px-4 py-3 text-sm leading-6 text-ink [overflow-wrap:anywhere]"><span className="font-bold">Assunto: </span>{message.email.subject}</p>}
        <p className="whitespace-pre-wrap px-4 py-5 text-sm leading-7 text-ink [overflow-wrap:anywhere]">{text}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">Itens exibidos apenas para esta simulação de destinatário autorizado. No envio futuro, detalhes exigem canal verificado; cashback creditado só aparece após pedido concluído e pago. O endereço loja.example é fictício.</p>
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button className="h-auto min-h-11 w-full whitespace-normal py-3 sm:w-auto" onClick={() => void copyText()} type="button" variant="secondary"><Copy aria-hidden="true" className="h-4 w-4 shrink-0" />Copiar texto da prévia</Button>
        <p className="text-xs leading-5 text-muted" role="status">{notice}</p>
      </div>
    </section>
  );
}
