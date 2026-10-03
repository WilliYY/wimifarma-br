import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decryptValue, encryptValue } from "@/lib/secret-vault";
import { PaymentError, paymentSettingsSchema } from "./schema";
import { mercadoPagoRequest } from "./provider";

export const PAYMENT_INTEGRATION_ID = "mercado-pago";
const secretsSchema = z.object({ accessToken: z.string().min(10), webhookSecret: z.string().min(10) });
let brandsCache: { accountId: string; expiresAt: number; brands: { id: string; name: string; image: string | null }[] } | null = null;
export async function readPaymentIntegration() {
  const row = await getPrisma().paymentIntegration.findUnique({ where: { id: PAYMENT_INTEGRATION_ID } });
  if (!row) return null;
  return { ...row, secrets: secretsSchema.parse(JSON.parse(decryptValue(row))) };
}
export async function paymentAvailability(isAdmin = false) {
  const row = await getPrisma().paymentIntegration.findUnique({ where: { id: PAYMENT_INTEGRATION_ID } });
  return Boolean(row && ((row.enabled && row.environment === "production") || (isAdmin && row.environment === "test")));
}
export async function publicPaymentConfiguration(isAdmin = false) {
  const row = await getPrisma().paymentIntegration.findUnique({ where: { id: PAYMENT_INTEGRATION_ID }, select: { publicKey: true, environment: true, enabled: true } });
  const available = row && ((row.enabled && row.environment === "production") || (isAdmin && row.environment === "test"));
  if (!available) return null;
  let brands: { id: string; name: string; image: string | null }[] = [];
  let connection: Awaited<ReturnType<typeof readPaymentIntegration>>;
  try { connection = await readPaymentIntegration(); }
  catch { console.error("[mercado-pago] connection-unavailable"); return null; }
  if (!connection) return null;
  try {
    if (connection) {
      if (brandsCache?.accountId === connection.accountId && brandsCache.expiresAt > Date.now()) brands = brandsCache.brands;
      else {
        const methods = z.array(z.object({ id: z.string().max(60), name: z.string().max(80), status: z.string(), payment_type_id: z.string(), secure_thumbnail: z.string().nullable().optional() })).parse(await mercadoPagoRequest("/v1/payment_methods", connection.secrets.accessToken));
        brands = methods.filter(method => method.status === "active" && ["credit_card", "debit_card", "prepaid_card"].includes(method.payment_type_id)).slice(0, 12).map(method => {
          let image: string | null = null;
          try { const url = new URL(method.secure_thumbnail ?? ""); if (url.origin === "https://http2.mlstatic.com") image = url.toString(); } catch { /* Brand name remains usable without an image. */ }
          return { id: method.id, name: method.name, image };
        });
        brandsCache = { accountId: connection.accountId, expiresAt: Date.now() + 30 * 60_000, brands };
      }
    }
  } catch { console.warn("[mercado-pago] brands-unavailable"); /* Provider fields still identify the accepted brand. */ }
  return { publicKey: row.publicKey, environment: row.environment, brands };
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
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239145)`;
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
