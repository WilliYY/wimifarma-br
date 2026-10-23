import type { Prisma } from "@/generated/prisma/client";
import { normalizeBrazilianPhone } from "@/lib/brazilian-phone";

type StatusOrder = { id: string; number: string; customerPhone: string; fulfillmentMethod: string; status: string };
export const customerOrderStages = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"] as const;
export type CustomerNotificationStatus = "QUEUED" | "DISABLED" | "FAILED" | "SKIPPED";

export function customerRecipient(phone: string): string | null {
  const local = normalizeBrazilianPhone(phone);
  return local ? `55${local}` : null;
}

export function formatCustomerOrderStatus(order: StatusOrder): string | null {
  if (!/^[a-z0-9-]{1,64}$/i.test(order.number) || !["PICKUP", "DELIVERY"].includes(order.fulfillmentMethod)) return null;
  const pickup = order.fulfillmentMethod === "PICKUP";
  const messages: Record<string, string> = {
    CONFIRMED: "A equipe confirmou seu pedido. Ele entrou em andamento.",
    PREPARING: "Estamos separando os produtos do seu pedido. Avisaremos quando estiver pronto.",
    READY: pickup ? "Seu pedido está pronto para retirada na Wimifarma. Compareça no horário de atendimento da farmácia." : "Seu pedido está separado e pronto para envio. Avisaremos quando sair para entrega.",
    OUT_FOR_DELIVERY: "Seu pedido saiu para envio ou entrega. A equipe informará os detalhes do acompanhamento.",
    COMPLETED: "Seu pedido foi concluído. Obrigado por comprar na Wimifarma!",
    CANCELED: "Seu pedido foi cancelado. Fale com a equipe se precisar de ajuda. A situação de eventual reembolso é informada separadamente.",
  };
  if (!messages[order.status] || pickup && order.status === "OUT_FOR_DELIVERY") return null;
  return `Wimifarma · Pedido ${order.number}\n\n${messages[order.status]}`;
}

/** Freeze the destination and stage text in the same transaction as the order change. */
export async function queueCustomerOrderStatus(tx: Prisma.TransactionClient, order: StatusOrder): Promise<CustomerNotificationStatus> {
  const text = formatCustomerOrderStatus(order);
  const stage = customerOrderStages.find(stage => stage === order.status);
  if (!text || !stage) return "SKIPPED";
  const config = await tx.miaubyConfig.findUnique({ where: { id: "commerce" } });
  if (!config?.enabled || !config.customerStatusAlerts) return "DISABLED";
  const recipient = customerRecipient(order.customerPhone);
  const event = await tx.miaubyEvent.upsert({
    where: { key: `customer-status:v1:${order.id}:${order.status}` }, update: {},
    create: { key: `customer-status:v1:${order.id}:${order.status}`, type: "order_status", text, recipient, orderId: order.id, orderStatus: stage,
      ...(recipient ? {} : { status: "FAILED", lastError: "Telefone do pedido inválido para WhatsApp. Confira o contato antes de avisar o cliente." }) },
  });
  return event.status === "FAILED" || event.status === "UNCERTAIN" ? "FAILED" : "QUEUED";
}
