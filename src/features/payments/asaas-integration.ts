import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decryptValue, encryptValue } from "@/lib/secret-vault";
import { asaasProviderRequest, retrieveActiveRandomPix, retrieveAsaasApproval, retrieveAsaasWalletId } from "./asaas-provider";
import { productionAsaasToken } from "./fee-settings";
import { PaymentError } from "./schema";

export const ASAAS_INTEGRATION_ID = "asaas";
const events = ["PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_DELETED", "PAYMENT_RESTORED",
  "PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL", "CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"];
const secretsSchema = z.object({ accessToken: z.string().regex(/^\$aact_prod_\S+$/).max(500), webhookSecret: z.string().regex(/^[a-f0-9]{64}$/),
  pixAddressKey: z.uuid().nullable(), webhookUrl: z.url().max(2000), webhookId: z.uuid().nullable(), registrationAttempted: z.boolean(),
  methods: z.array(z.enum(["pix", "card"])).max(2), email: z.email().max(160) }).strict();
export type AsaasSecrets = z.infer<typeof secretsSchema>;
const failure = () => new PaymentError("A equipe precisa conferir a conexão Asaas.", 503);
function webhookBase() {
  const url = new URL(process.env.AUTH_URL ?? "");
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw failure();
  return `${url.origin}/api/pagamentos/asaas/webhook`;
}
export function decodeAsaasIntegration(row: { environment: string; accountId: string; publicKey: string; ciphertext: string; iv: string; tag: string }) {
  if (row.environment !== "production" || row.publicKey !== "" || !z.uuid().safeParse(row.accountId).success) throw failure();
  const data = secretsSchema.parse(JSON.parse(decryptValue(row)));
  const url = new URL(data.webhookUrl), nonce = url.searchParams.get("binding");
  if (`${url.origin}${url.pathname}` !== webhookBase() || !z.uuid().safeParse(nonce).success || url.search !== `?binding=${nonce}` || url.hash || url.username || url.password) throw failure();
  return data;
}
export async function readAsaasIntegration() {
  try {
    const row = await getPrisma().paymentIntegration.findUnique({ where: { id: ASAAS_INTEGRATION_ID } });
    if (!row) return null;
    const secrets = decodeAsaasIntegration(row);
    return { ...row, connection: { accessToken: secrets.accessToken, environment: "production" as const }, secrets };
  } catch (error) { if (error instanceof PaymentError) throw error; throw failure(); }
}
export async function asaasIntegrationView() {
  const row = await readAsaasIntegration();
  return { revision: row?.revision ?? 0, connected: Boolean(row), enabled: row?.enabled ?? false,
    webhookRegistered: Boolean(row?.secrets.webhookId), methods: row?.secrets.methods ?? [], pixKeyActive: Boolean(row?.secrets.pixAddressKey) };
}
const hookSchema = z.object({ id: z.uuid(), url: z.url(), name: z.string(), email: z.email(), enabled: z.boolean(), interrupted: z.boolean(),
  apiVersion: z.number(), hasAuthToken: z.boolean(), sendType: z.string(), events: z.array(z.string()), authToken: z.string().optional() });
function confirmedHook(raw: unknown, secrets: AsaasSecrets) {
  const hook = hookSchema.parse(raw);
  if (hook.url !== secrets.webhookUrl || hook.name !== "Wimifarma" || hook.email !== secrets.email || !hook.enabled || hook.interrupted
    || hook.apiVersion !== 3 || !hook.hasAuthToken || hook.sendType !== "SEQUENTIALLY" || hook.events.length !== events.length
    || new Set(hook.events).size !== events.length || !events.every(event => hook.events.includes(event))
    || (hook.authToken !== undefined && hook.authToken !== secrets.webhookSecret)) throw failure();
  return hook.id;
}
export async function prepareAsaasIntegration(input: { revision: number; email: string }, userId: string) {
  const accessToken = await productionAsaasToken(), current = await readAsaasIntegration();
  if ((current?.revision ?? 0) !== input.revision) throw new PaymentError("Configuração alterada. Recarregue.");
  const connection = { accessToken, environment: "production" as const };
  if (!await retrieveAsaasApproval(connection)) throw new PaymentError("A conta Asaas ainda não está aprovada.", 422);
  const accountId = await retrieveAsaasWalletId(connection), pix = await retrieveActiveRandomPix(connection);
  // Renewing access to the verified same wallet preserves all historical bindings.
  const rotates = Boolean(current && (current.accountId !== accountId || current.secrets.pixAddressKey !== (pix?.key ?? null)));
  const secrets: AsaasSecrets = current && current.accountId === accountId ? { ...current.secrets, accessToken, pixAddressKey: pix?.key ?? null, email: input.email }
    : { accessToken, pixAddressKey: pix?.key ?? null, email: input.email, webhookSecret: randomBytes(32).toString("hex"),
      webhookUrl: `${webhookBase()}?binding=${randomUUID()}`, webhookId: null, registrationAttempted: false, methods: [] };
  const hooks = z.object({ data: z.array(hookSchema).max(100), hasMore: z.literal(false) }).parse(await asaasProviderRequest(connection, "/webhooks?offset=0&limit=100"));
  const matching = hooks.data.filter(hook => { const url = new URL(hook.url); return `${url.origin}${url.pathname}` === webhookBase(); });
  if (matching.length > 1) throw failure();
  const remoteId = matching.length ? confirmedHook(matching[0], secrets) : null;
  if ((secrets.webhookId && remoteId !== secrets.webhookId) || (!remoteId && secrets.registrationAttempted)) throw failure();
  const mayPost = !remoteId && !secrets.registrationAttempted;
  secrets.webhookId = remoteId; secrets.registrationAttempted = true;
  const prisma = getPrisma();
  const saved = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239149)`;
    const row = await tx.paymentIntegration.findUnique({ where: { id: ASAAS_INTEGRATION_ID } });
    if ((row?.revision ?? 0) !== input.revision) throw new PaymentError("Configuração alterada. Recarregue.");
    if (rotates && await tx.onlinePayment.count({ where: { integrationId: ASAAS_INTEGRATION_ID, status: { notIn: ["FAILED", "CANCELED"] } } })) throw new PaymentError("Há pagamentos vinculados. Não troque a conta ou a credencial.");
    const data = { ...encryptValue(JSON.stringify(secrets)), publicKey: "", accountId, environment: "production", enabled: rotates ? false : row?.enabled ?? false };
    const prepared = row ? await tx.paymentIntegration.update({ where: { id: row.id }, data: { ...data, revision: { increment: 1 } } })
      : await tx.paymentIntegration.create({ data: { id: ASAAS_INTEGRATION_ID, ...data, revision: 1 } });
    await tx.auditLog.create({ data: { userId, action: "ASAAS_PRODUCTION_PREPARED", entity: "PaymentIntegration", entityId: prepared.id,
      metadata: { environment: "production", webhookRegistered: Boolean(remoteId), pixKeyActive: Boolean(pix) } } });
    return prepared;
  });
  if (!mayPost) return;
  // Persisted registration claim prevents duplicate remote configuration on uncertain responses.
  const registered = await asaasProviderRequest(connection, "/webhooks", { name: "Wimifarma", email: secrets.email, url: secrets.webhookUrl,
    enabled: true, interrupted: false, apiVersion: 3, authToken: secrets.webhookSecret, sendType: "SEQUENTIALLY", events });
  const id = confirmedHook(registered, secrets);
  await prisma.$transaction(async tx => {
    const changed = await tx.paymentIntegration.updateMany({ where: { id: ASAAS_INTEGRATION_ID, revision: saved.revision },
      data: { ...encryptValue(JSON.stringify({ ...secrets, webhookId: id })), revision: { increment: 1 } } });
    if (!changed.count) throw failure();
    await tx.auditLog.create({ data: { userId, action: "ASAAS_PRODUCTION_WEBHOOK_REGISTERED", entity: "PaymentIntegration", entityId: ASAAS_INTEGRATION_ID, metadata: { webhookId: id } } });
  });
}
export async function activateAsaasIntegration(input: { revision: number; enabled: boolean; methods: ("pix" | "card")[] }, userId: string) {
  const current = await readAsaasIntegration();
  if (!current || current.revision !== input.revision) throw new PaymentError("Recarregue a conexão Asaas.");
  if (input.enabled) {
    if (!current.secrets.webhookId || !input.methods.length || !await retrieveAsaasApproval(current.connection)
      || await retrieveAsaasWalletId(current.connection) !== current.accountId) throw failure();
    for (const method of input.methods) {
      if (method === "pix" && !current.secrets.pixAddressKey) throw new PaymentError("Cadastre uma chave Pix aleatória ativa no Asaas.", 422);
      const proofs = await getPrisma().onlinePayment.count({ where: { provider: "asaas", integrationId: "asaas-sandbox", environment: "test", method,
        status: "PAID", providerOrderId: { not: null }, ...(method === "card" ? { installments: 1 } : {}) } });
      if (!proofs) throw new PaymentError(`Conclua o recebimento ${method === "pix" ? "Pix" : "do cartão"} no Sandbox antes de liberar clientes.`, 422);
    }
  }
  await getPrisma().$transaction(async tx => {
    const changed = await tx.paymentIntegration.updateMany({ where: { id: ASAAS_INTEGRATION_ID, revision: input.revision },
      data: { enabled: input.enabled, ...encryptValue(JSON.stringify({ ...current.secrets, methods: input.methods })), revision: { increment: 1 } } });
    if (!changed.count) throw new PaymentError("Configuração alterada. Recarregue.");
    await tx.auditLog.create({ data: { userId, action: "ASAAS_PRODUCTION_ACTIVATION", entity: "PaymentIntegration", entityId: ASAAS_INTEGRATION_ID,
      metadata: { enabled: input.enabled, methods: input.methods } } });
  });
}
