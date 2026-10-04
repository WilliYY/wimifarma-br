import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decryptValue, encryptValue } from "@/lib/secret-vault";
import { feeRulesSchema } from "./fee-policy";
import { retrieveAsaasFees } from "./asaas-fees";
import { PaymentError } from "./schema";

const ID = "payment-fee-policy";
const storedSchema = z.object({ rules: feeRulesSchema, apiKey: z.string().max(500).optional(),
  environment: z.enum(["production", "sandbox"]).default("production"), zeroInterestInstallments: z.number().int().min(1).max(12).default(1),
  lastSyncAt: z.string().datetime().nullable().default(null) });
export const feeSettingsInput = z.object({ revision: z.number().int().nonnegative(), rules: feeRulesSchema,
  apiKey: z.string().trim().min(15).max(500).optional(), environment: z.enum(["production", "sandbox"]),
  zeroInterestInstallments: z.number().int().min(1).max(12) }).strict();

async function readStored() {
  const row = await getPrisma().paymentIntegration.findUnique({ where: { id: ID } });
  return { revision: row?.revision ?? 0, config: row ? storedSchema.parse(JSON.parse(decryptValue(row))) : storedSchema.parse({ rules: [] }) };
}
export async function feeSettingsView() {
  const { revision, config } = await readStored();
  return { revision, rules: config.rules, environment: config.environment, zeroInterestInstallments: config.zeroInterestInstallments,
    connected: Boolean(config.apiKey), lastSyncAt: config.lastSyncAt, chargesEnabled: false as const };
}
async function persist(config: z.infer<typeof storedSchema>, revision: number, action: string, userId?: string) {
  const data = encryptValue(JSON.stringify(storedSchema.parse(config)));
  await getPrisma().$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239147)`;
    const current = await tx.paymentIntegration.findUnique({ where: { id: ID } });
    if ((current?.revision ?? 0) !== revision) throw new PaymentError("As tarifas foram atualizadas. Recarregue o painel.");
    const previous = current ? storedSchema.parse(JSON.parse(decryptValue(current))) : storedSchema.parse({ rules: [] });
    const comparable = (rules: z.infer<typeof storedSchema>["rules"]) => rules.map(rule => ({
      id: rule.id, provider: rule.provider, method: rule.method, fixedCents: rule.fixedCents, percentageBps: rule.percentageBps,
      minimumFeeCents: rule.minimumFeeCents, maximumFeeCents: rule.maximumFeeCents, minInstallments: rule.minInstallments,
      maxInstallments: rule.maxInstallments, zeroInterestInstallments: rule.zeroInterestInstallments, settlementDays: rule.settlementDays, source: rule.source,
    }));
    if (current) await tx.paymentIntegration.update({ where: { id: ID }, data: { ...data, revision: { increment: 1 } } });
    else await tx.paymentIntegration.create({ data: { id: ID, publicKey: "fee-policy-v1", accountId: "fee-comparison-only", environment: "production", enabled: false, ...data } });
    await tx.auditLog.create({ data: { ...(userId ? { userId } : {}), action, entity: "PaymentFeePolicy", entityId: ID,
      metadata: { ruleCount: config.rules.length, connected: Boolean(config.apiKey), environment: config.environment,
        changed: JSON.stringify(comparable(previous.rules)) !== JSON.stringify(comparable(config.rules)),
        before: comparable(previous.rules), after: comparable(config.rules) } } });
  });
}
export async function saveFeeSettings(input: z.infer<typeof feeSettingsInput>, userId: string) {
  const stored = await readStored();
  if (stored.revision !== input.revision) throw new PaymentError("As tarifas foram atualizadas. Recarregue o painel.");
  const config = { ...stored.config, rules: input.rules.filter(rule => !rule.id.startsWith("asaas-api-")),
    environment: input.environment, zeroInterestInstallments: input.zeroInterestInstallments,
    apiKey: input.apiKey || stored.config.apiKey };
  if (config.rules.length > 45) throw new PaymentError("Limite de 45 tarifas manuais; reserve três posições para a consulta automática.", 422);
  if (config.apiKey) {
    if (input.environment !== stored.config.environment && !input.apiKey) throw new PaymentError("Informe a credencial do novo ambiente.", 422);
    const imported = await retrieveAsaasFees(config.apiKey, config.environment, config.zeroInterestInstallments);
    // Sandbox pricing cannot rank real merchant purchases.
    if (config.environment === "production") config.rules = [...config.rules, ...imported];
    config.lastSyncAt = new Date().toISOString();
  }
  await persist(config, stored.revision, "PAYMENT_FEES_SETTINGS_UPDATED", userId);
}
let syncing = false;
let lastAttempt = 0;
export async function synchronizeFeeSettings(userId?: string) {
  if (syncing) throw new PaymentError("Consulta de tarifas em andamento.");
  if (!userId && Date.now() - lastAttempt < 6 * 60 * 60_000) return;
  syncing = true;
  lastAttempt = Date.now();
  try {
    const { revision, config } = await readStored();
    if (!config.apiKey) { if (userId) throw new PaymentError("Conecte a conta Asaas para consultar suas tarifas.", 422); return; }
    const imported = await retrieveAsaasFees(config.apiKey, config.environment, config.zeroInterestInstallments);
    const rules = config.rules.filter(rule => !rule.id.startsWith("asaas-api-"));
    await persist({ ...config, rules: config.environment === "production" ? [...rules, ...imported] : rules, lastSyncAt: new Date().toISOString() }, revision, "PAYMENT_FEES_SYNCHRONIZED", userId);
  } finally { syncing = false; }
}
