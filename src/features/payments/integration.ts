import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decryptValue, encryptValue } from "@/lib/secret-vault";
import { PaymentError, paymentSettingsSchema } from "./schema";
import { mercadoPagoRequest } from "./provider";

export const PAYMENT_INTEGRATION_ID = "mercado-pago";
const secretsSchema = z.object({ accessToken: z.string().min(10), webhookSecret: z.string().min(10) });
export async function readPaymentIntegration() {
  const row = await getPrisma().paymentIntegration.findUnique({ where: { id: PAYMENT_INTEGRATION_ID } });
  if (!row) return null;
  return { ...row, secrets: secretsSchema.parse(JSON.parse(decryptValue(row))) };
}
export async function paymentAvailability(isAdmin = false) {
  const row = await getPrisma().paymentIntegration.findUnique({ where: { id: PAYMENT_INTEGRATION_ID } });
  return Boolean(row && ((row.enabled && row.environment === "production") || (isAdmin && row.environment === "test")));
}
export async function savePaymentIntegration(input: z.infer<typeof paymentSettingsSchema>, userId: string) {
  const existing = await readPaymentIntegration();
  if ((existing?.revision ?? 0) !== input.revision) throw new PaymentError("Configuração alterada. Atualize a página.");
  const changed = Boolean(input.accessToken) || existing?.environment !== input.environment || existing?.publicKey !== input.publicKey;
  if (changed && input.enabled) throw new PaymentError("Salve e valide a conexão desativada antes de liberar o pagamento.");
  if (input.enabled && input.environment !== "production") throw new PaymentError("Contas de teste não podem receber pagamentos reais.");
  const secrets = secretsSchema.safeParse({ accessToken: input.accessToken || existing?.secrets.accessToken, webhookSecret: input.webhookSecret || existing?.secrets.webhookSecret });
  if (!secrets.success) throw new PaymentError("Informe o Access Token e a assinatura secreta do webhook.", 422);
  if (existing?.environment !== input.environment && !input.accessToken) throw new PaymentError("Informe as credenciais correspondentes ao novo ambiente.");
  const account = z.object({ id: z.union([z.string(), z.number()]).transform(String), site_id: z.literal("MLB"), tags: z.array(z.string()).default([]) }).parse(await mercadoPagoRequest("/users/me", secrets.data.accessToken));
  if ((input.environment === "test") !== account.tags.includes("test_user")) throw new PaymentError("A conta não corresponde ao ambiente selecionado. Use as credenciais do vendedor de teste para homologação.");
  return getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(728239145)`;
    if (changed && await tx.onlinePayment.count({ where: { OR: [
      { environment: "production", status: { notIn: ["FAILED", "CANCELED"] } },
      { status: { in: ["NEW", "SUBMITTING", "UNKNOWN", "PENDING"] } },
    ] } })) {
      throw new PaymentError("Há pagamentos vinculados à conexão. A troca de conta exige uma migração assistida para manter as notificações.");
    }
    const data = { enabled: input.enabled, environment: input.environment, publicKey: input.publicKey, accountId: account.id, ...encryptValue(JSON.stringify(secrets.data)) };
    if (existing) {
      const updated = await tx.paymentIntegration.updateMany({ where: { id: PAYMENT_INTEGRATION_ID, revision: input.revision }, data: { ...data, revision: { increment: 1 } } });
      if (updated.count !== 1) throw new PaymentError("Configuração alterada. Atualize a página.");
    } else await tx.paymentIntegration.create({ data: { id: PAYMENT_INTEGRATION_ID, ...data } });
    await tx.auditLog.create({ data: { userId, action: "PAYMENT_SETTINGS_UPDATED", entity: "PaymentIntegration", entityId: PAYMENT_INTEGRATION_ID,
      metadata: { enabled: input.enabled, environment: input.environment, credentialsChanged: changed } } });
  });
}
