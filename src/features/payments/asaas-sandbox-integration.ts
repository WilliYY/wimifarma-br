import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decryptValue, encryptValue } from "@/lib/secret-vault";
import { asaasProviderRequest, retrieveActiveRandomPix, retrieveAsaasApproval, retrieveAsaasWalletId } from "./asaas-provider";
import { PaymentError } from "./schema";

export const ASAAS_SANDBOX_INTEGRATION_ID = "asaas-sandbox";
const events = ["PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_DELETED",
  "PAYMENT_RESTORED", "PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"];
const unresolved = ["NEW", "SUBMITTING", "UNKNOWN", "PENDING", "REVIEW", "PAID", "PARTIALLY_REFUNDED"];
const credentialId = z.string().trim().min(1).max(128);
const secretsSchema = z.object({ accessToken: z.string().regex(/^\$aact_hmlg_\S+$/).max(500),
  webhookSecret: z.string().regex(/^[a-f0-9]{64}$/), pixAddressKey: z.uuid(), webhookUrl: z.url().max(2000),
  webhookId: z.uuid().nullable(), credentialId, registrationAttempted: z.boolean() }).strict();
export type AsaasSandboxSecrets = z.infer<typeof secretsSchema>;
const prepareSchema = z.object({ credentialId, email: z.email().max(160), revision: z.number().int().nonnegative() }).strict();
type Input = z.infer<typeof prepareSchema>;
const unconfirmed = () => new PaymentError("Não foi possível confirmar a preparação Asaas. Consulte a configuração antes de continuar.", 503);
const conflict = () => new PaymentError("A configuração Sandbox mudou. Recarregue o painel.", 409);

function webhookBase() {
  let url: URL;
  try { url = new URL(process.env.AUTH_URL ?? ""); } catch { throw new PaymentError("Configure a origem HTTPS do site.", 422); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new PaymentError("Configure a origem HTTPS do site.", 422);
  return `${url.origin}/api/pagamentos/asaas/sandbox/webhook`;
}
function validateWebhookUrl(value: string) {
  const base = webhookBase();
  const url = new URL(value);
  const binding = url.searchParams.get("binding");
  if (`${url.origin}${url.pathname}` !== base || !binding || !z.uuid().safeParse(binding).success
    || url.search !== `?binding=${binding}` || url.username || url.password || url.hash) throw unconfirmed();
}
function decode(row: { accountId: string; environment: string; enabled: boolean; publicKey: string; ciphertext: string; iv: string; tag: string }) {
  if (row.environment !== "test" || row.enabled || row.publicKey !== "" || !z.uuid().safeParse(row.accountId).success) throw unconfirmed();
  const parsed = secretsSchema.safeParse(JSON.parse(decryptValue(row)));
  if (!parsed.success) throw unconfirmed();
  validateWebhookUrl(parsed.data.webhookUrl);
  return parsed.data;
}
export async function readAsaasSandboxIntegration() {
  try {
    const row = await getPrisma().paymentIntegration.findUnique({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID } });
    if (!row) return null;
    const secrets = decode(row);
    return { ...row, connection: { accessToken: secrets.accessToken, environment: "test" as const }, secrets };
  } catch (error) { if (error instanceof PaymentError) throw error; throw unconfirmed(); }
}
async function selectedToken(id: string) {
  const row = await getPrisma().secretCredential.findUnique({ where: { id }, select: {
    service: true, identifier: true, secretCiphertext: true, secretIv: true, secretTag: true,
  } });
  if (!row || row.service?.toLowerCase() !== "asaas" || row.identifier?.toLowerCase() !== "sandbox") {
    throw new PaymentError("Selecione a credencial Asaas Sandbox do cofre.", 422);
  }
  const token = decryptValue({ ciphertext: row.secretCiphertext, iv: row.secretIv, tag: row.secretTag });
  if (!secretsSchema.shape.accessToken.safeParse(token).success) throw new PaymentError("A credencial não pertence ao Sandbox.", 422);
  return token;
}
const hookSchema = z.object({ id: z.uuid(), url: z.url().max(2000), name: z.string().max(100), email: z.email().max(160),
  enabled: z.boolean(), interrupted: z.boolean(), apiVersion: z.number().int(), hasAuthToken: z.boolean(),
  sendType: z.enum(["SEQUENTIALLY", "NON_SEQUENTIALLY"]), events: z.array(z.string().max(100)).max(150),
  authToken: z.string().max(255).optional() });
function compatible(raw: unknown, secrets: AsaasSandboxSecrets, email: string) {
  const parsed = hookSchema.safeParse(raw);
  if (!parsed.success) throw unconfirmed();
  const hook = parsed.data;
  if (hook.url !== secrets.webhookUrl || hook.name !== "Wimifarma Sandbox" || hook.email !== email || !hook.enabled || hook.interrupted
    || hook.apiVersion !== 3 || !hook.hasAuthToken || hook.sendType !== "SEQUENTIALLY"
    || hook.events.length !== events.length || new Set(hook.events).size !== events.length || !events.every(event => hook.events.includes(event))
    || (hook.authToken !== undefined && hook.authToken !== secrets.webhookSecret)) throw unconfirmed();
  // hasAuthToken proves presence only. Authentication is checked on incoming deliveries.
  return hook.id;
}
async function remoteHook(connection: { accessToken: string; environment: "test" }, secrets: AsaasSandboxSecrets, email: string) {
  const parsed = z.object({ data: z.array(hookSchema).max(100), hasMore: z.literal(false) }).safeParse(
    await asaasProviderRequest(connection, "/webhooks?offset=0&limit=100"));
  if (!parsed.success) throw unconfirmed();
  const sameEndpoint = parsed.data.data.filter(hook => {
    const url = new URL(hook.url);
    return `${url.origin}${url.pathname}` === webhookBase();
  });
  if (sameEndpoint.length > 1 || sameEndpoint.some(hook => hook.url !== secrets.webhookUrl)) throw unconfirmed();
  return sameEndpoint.length ? compatible(sameEndpoint[0], secrets, email) : null;
}

export async function prepareAsaasSandboxIntegration(input: Input, userId: string) {
  try {
    const parsed = prepareSchema.safeParse(input);
    if (!parsed.success) throw new PaymentError("Confira a credencial, o e-mail e a revisão da configuração.", 422);
    const data = parsed.data;
    webhookBase();
    const accessToken = await selectedToken(data.credentialId);
    const current = await readAsaasSandboxIntegration();
    if ((current?.revision ?? 0) !== data.revision) throw conflict();
    const connection = { accessToken, environment: "test" as const };
    if (!await retrieveAsaasApproval(connection)) throw new PaymentError("A conta Sandbox ainda não está aprovada.", 422);
    const accountId = await retrieveAsaasWalletId(connection);
    const pix = await retrieveActiveRandomPix(connection);
    if (!pix) throw new PaymentError("A conta Sandbox precisa de uma chave Pix aleatória ativa.", 422);
    const rotates = Boolean(current && (current.secrets.accessToken !== accessToken || current.accountId !== accountId
      || current.secrets.credentialId !== data.credentialId || current.secrets.pixAddressKey !== pix.key));
    if (rotates && current!.secrets.registrationAttempted && !current!.secrets.webhookId) throw unconfirmed();
    const prisma = getPrisma();
    if (rotates) await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239148)`;
      const previous = await tx.paymentIntegration.findUnique({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID } });
      if (!previous || previous.revision !== data.revision) throw conflict();
      if (await tx.onlinePayment.count({ where: { provider: "asaas", integrationId: ASAAS_SANDBOX_INTEGRATION_ID, status: { in: unresolved } } })) {
        throw new PaymentError("Há pagamentos Asaas vinculados. Não troque a credencial, a conta ou a chave Pix durante a homologação.", 409);
      }
    });
    const secrets: AsaasSandboxSecrets = current && current.accountId === accountId ? {
      ...current.secrets, accessToken, credentialId: data.credentialId, pixAddressKey: pix.key,
    } : {
      accessToken, webhookSecret: randomBytes(32).toString("hex"), pixAddressKey: pix.key,
      webhookUrl: `${webhookBase()}?binding=${randomUUID()}`, webhookId: null,
      credentialId: data.credentialId, registrationAttempted: false,
    };
    const knownRemoteId = await remoteHook(connection, secrets, data.email);
    if (secrets.webhookId && knownRemoteId !== secrets.webhookId) throw unconfirmed();
    if (!knownRemoteId && secrets.registrationAttempted) throw unconfirmed();
    const mayPost = !knownRemoteId && !secrets.registrationAttempted;
    secrets.webhookId = knownRemoteId;
    secrets.registrationAttempted = true;
    const prepared = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239148)`;
      const previous = await tx.paymentIntegration.findUnique({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID } });
      if ((previous?.revision ?? 0) !== data.revision) throw conflict();
      if (previous) decode(previous);
      if (rotates && await tx.onlinePayment.count({ where: { provider: "asaas", integrationId: ASAAS_SANDBOX_INTEGRATION_ID, status: { in: unresolved } } })) {
        throw new PaymentError("Há pagamentos Asaas vinculados. Não troque a credencial, a conta ou a chave Pix durante a homologação.", 409);
      }
      if (previous && previous.accountId === accountId && JSON.stringify(decode(previous)) === JSON.stringify(secrets)) return previous;
      const encrypted = encryptValue(JSON.stringify(secrets));
      const row = previous ? await tx.paymentIntegration.update({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID }, data: {
        ...encrypted, accountId, environment: "test", enabled: false, publicKey: "", revision: { increment: 1 },
      } }) : await tx.paymentIntegration.create({ data: { id: ASAAS_SANDBOX_INTEGRATION_ID, ...encrypted,
        accountId, environment: "test", enabled: false, publicKey: "", revision: 1 } });
      await tx.auditLog.create({ data: { action: "ASAAS_SANDBOX_PREPARED", entity: "PaymentIntegration",
        entityId: ASAAS_SANDBOX_INTEGRATION_ID, userId, metadata: { credentialId: data.credentialId, webhookRegistered: Boolean(knownRemoteId), environment: "test" } } });
      return row;
    });
    if (!mayPost) return;
    // The durable claim above is never reset, including failures after the remote POST.
    const created = await asaasProviderRequest(connection, "/webhooks", {
      name: "Wimifarma Sandbox", url: secrets.webhookUrl, email: data.email, enabled: true, interrupted: false,
      apiVersion: 3, authToken: secrets.webhookSecret, sendType: "SEQUENTIALLY", events,
    });
    const remoteId = compatible(created, secrets, data.email);
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239148)`;
      const previous = await tx.paymentIntegration.findUnique({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID } });
      if (!previous || previous.revision !== prepared.revision) throw conflict();
      const retained = decode(previous);
      if (retained.webhookUrl !== secrets.webhookUrl || retained.webhookSecret !== secrets.webhookSecret || !retained.registrationAttempted) throw conflict();
      await tx.paymentIntegration.update({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID }, data: {
        ...encryptValue(JSON.stringify({ ...retained, webhookId: remoteId })), revision: { increment: 1 },
      } });
      await tx.auditLog.create({ data: { action: "ASAAS_SANDBOX_WEBHOOK_REGISTERED", entity: "PaymentIntegration",
        entityId: ASAAS_SANDBOX_INTEGRATION_ID, userId, metadata: { webhookId: remoteId, environment: "test" } } });
    });
  } catch (error) { if (error instanceof PaymentError) throw error; throw unconfirmed(); }
}
