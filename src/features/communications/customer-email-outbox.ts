import { env } from "node:process";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { readBrevoSenderConfiguration } from "./brevo-email";

export function readCommerceEmailSender() {
  const configuration = readBrevoSenderConfiguration(env);
  return configuration?.BREVO_SENDER_EMAIL === "pedidos@emails.wimifarma.com.br" && configuration.BREVO_SENDER_NAME === "Wimifarma" ? configuration : null;
}

export function isCustomerOrderEmailConfigured() {
  return env.CUSTOMER_ORDER_EMAIL_MODE === "enabled" && Boolean(readCommerceEmailSender());
}

export function isCustomerCartEmailConfigured() {
  return env.CUSTOMER_CART_EMAIL_MODE === "enabled" && Boolean(readCommerceEmailSender());
}

type CustomerEmailEventInput = { eventKey: string } & (
  { kind: "ORDER_RECEIVED"; orderId: string; discloseProductIds: string[] }
  | { kind: "ORDER_STATUS"; orderId: string; status: OrderStatus }
  | { kind: "ABANDONED_CART"; cartCustomerId: string; availableAt: Date }
);

export async function queueCustomerEmail(tx: Prisma.TransactionClient, input: CustomerEmailEventInput) {
  const isCart = input.kind === "ABANDONED_CART";
  if (!(isCart ? isCustomerCartEmailConfigured() : isCustomerOrderEmailConfigured())) return;
  await tx.customerEmailEvent.upsert({
    where: { eventKey: input.eventKey },
    create: input,
    update: {},
  });
  if (isCart) {
    await tx.customerEmailEvent.updateMany({
      where: { eventKey: input.eventKey, state: "PENDING" },
      data: { availableAt: input.availableAt },
    });
  }
}
