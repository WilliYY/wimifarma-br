import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { customerRecipient, formatCustomerOrderStatus, queueCustomerOrderStatus } from "./customer-order-status";

const order = { id: "synthetic", number: "WIM-SYNTHETIC", customerPhone: "(11) 99999-0000", fulfillmentMethod: "PICKUP", status: "READY" };
test("mensagem de etapa distingue retirada/envio sem incluir produtos ou afirmar pagamento", () => {
  assert.match(formatCustomerOrderStatus(order)!, /pronto para retirada/);
  assert.match(formatCustomerOrderStatus({ ...order, fulfillmentMethod: "DELIVERY" })!, /pronto para envio/);
  assert.equal(formatCustomerOrderStatus({ ...order, status: "OUT_FOR_DELIVERY" }), null);
  assert.equal(formatCustomerOrderStatus({ ...order, number: "x\n@grupo" }), null);
  assert.doesNotMatch(formatCustomerOrderStatus(order)!, /pagamento|medicamento|receita/i);
});
test("destinatário só aceita telefone brasileiro canônico", () => {
  assert.equal(customerRecipient("+55 (11) 99999-0000"), "5511999990000");
  for (const phone of ["+1 2025550100", "5511999990000@g.us", "https://example.invalid", "(20)99999-0000", "(11)6999-0000"]) assert.equal(customerRecipient(phone), null);
});
test("fila exige ativação explícita, congela destino, deduplica etapa e registra contato inválido sem travar operação", async () => {
  const events: Record<string, unknown>[] = [];
  let settings: { enabled: boolean; customerStatusAlerts: boolean } | null = null;
  const tx = { miaubyConfig: { findUnique: async () => settings }, miaubyEvent: { upsert: async ({ create }: { create: Record<string, unknown> }) => {
    const existing = events.find(item => item.key === create.key); if (existing) return existing;
    const event = { status: "PENDING", ...create }; events.push(event); return event;
  } } } as unknown as Prisma.TransactionClient;
  assert.equal(await queueCustomerOrderStatus(tx, order), "DISABLED");
  settings = { enabled: true, customerStatusAlerts: false };
  assert.equal(await queueCustomerOrderStatus(tx, order), "DISABLED");
  assert.equal(events.length, 0);
  settings.customerStatusAlerts = true;
  assert.equal(await queueCustomerOrderStatus(tx, order), "QUEUED");
  assert.equal(await queueCustomerOrderStatus(tx, { ...order, customerPhone: "(21)99999-0000" }), "QUEUED");
  assert.equal(events.length, 1);
  assert.equal(events[0].recipient, "5511999990000");
  assert.equal(await queueCustomerOrderStatus(tx, { ...order, id: "invalid", customerPhone: "invalid" }), "FAILED");
  assert.equal(events[1].recipient, null);
  assert.equal(events[1].status, "FAILED");
});
