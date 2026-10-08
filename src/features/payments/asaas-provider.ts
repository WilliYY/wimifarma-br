import { z } from "zod";
import { PaymentError } from "./schema";

export type AsaasConnection = { accessToken: string; environment: "test" | "production" };
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const paymentId = z.string().regex(/^pay_[a-zA-Z0-9_-]{1,96}$/);
const amountCents = z.number().int().min(1).max(100_000_000);
const money = z.number().finite().min(0).max(1_000_000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7);
const reference = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const nullableId = identifier.nullish();
const uncertainMessage = "Não foi possível confirmar a operação Asaas. Consulte o recurso antes de tentar novamente.";

// Internal integrations share the same fixed host, limits and no-retry transport.
export { request as asaasProviderRequest };

export const asaasPaymentSchema = z.object({
  id: paymentId,
  billingType: z.enum(["UNDEFINED", "BOLETO", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER", "DEPOSIT", "PIX"]),
  status: z.enum(["PENDING", "RECEIVED", "CONFIRMED", "OVERDUE", "REFUNDED", "RECEIVED_IN_CASH",
    "REFUND_REQUESTED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE",
    "AWAITING_CHARGEBACK_REVERSAL", "DUNNING_REQUESTED", "DUNNING_RECEIVED", "AWAITING_RISK_ANALYSIS"]),
  value: money, netValue: money,
  deleted: z.boolean().optional(),
  pixQrCodeId: nullableId, checkoutSession: nullableId, externalReference: z.string().max(200).nullish(),
  refunds: z.array(z.object({
    status: z.enum(["PENDING", "AWAITING_CRITICAL_ACTION_AUTHORIZATION", "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION", "CANCELLED", "DONE"]),
    value: money,
    dateCreated: z.string().min(1).max(50).optional(), effectiveDate: z.string().min(1).max(50).nullish(),
  })).max(100).nullish(),
  chargeback: z.object({ id: identifier, payment: paymentId.optional(),
    status: z.enum(["REQUESTED", "IN_DISPUTE", "DISPUTE_LOST", "REVERSED", "DONE"]), value: money }).nullish(),
});
export type AsaasPayment = z.infer<typeof asaasPaymentSchema>;
export type AsaasPaymentResource =
  | { pixQrCodeId: string; pixCode: string; pixEncodedImage: string; pixExpiresAt: string; allowsMultiplePayments: false }
  | { checkoutSessionId: string; checkoutUrl: string; status: "ACTIVE" | "CANCELED" | "EXPIRED" | "PAID" };
export type AsaasResourceBinding = { pixQrCodeId: string } | { checkoutSessionId: string };
export type AsaasExpectedPayment = { amountCents: number; method: "pix" | "card"; resource: AsaasResourceBinding;
  externalReference?: string; paymentId?: string };

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new PaymentError("Dados da operação Asaas inválidos.", 422);
  return parsed.data;
}
function origin(connection: AsaasConnection) {
  const parsed = parse(z.object({ accessToken: z.string().max(500), environment: z.enum(["test", "production"]) }).strict(), connection);
  const prefix = parsed.environment === "test" ? "$aact_hmlg_" : "$aact_prod_";
  if (!parsed.accessToken.startsWith(prefix) || parsed.accessToken.length <= prefix.length || /\s/.test(parsed.accessToken)) {
    throw new PaymentError("Confira a credencial e o ambiente Asaas.", 422);
  }
  return parsed.environment === "test" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
}
async function request(connection: AsaasConnection, path: string, body?: unknown): Promise<unknown> {
  const host = origin(connection);
  try {
    const response = await fetch(`${host}${path}`, { method: body === undefined ? "GET" : "POST",
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { access_token: connection.accessToken, Accept: "application/json", "Content-Type": "application/json", "User-Agent": "Wimifarma/payments" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok || !response.body) throw new Error("Unconfirmed response");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 256_000) { await reader.cancel(); throw new Error("Response limit"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch { throw new PaymentError(uncertainMessage, 503); }
}
function response<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new PaymentError(uncertainMessage, 503);
  return result.data;
}
function listSchema<T>(item: z.ZodType<T>) {
  return z.object({ data: z.array(item).max(100), hasMore: z.literal(false) });
}

export async function retrieveAsaasWalletId(connection: AsaasConnection) {
  const result = response(listSchema(z.object({ id: z.uuid() })), await request(connection, "/wallets/"));
  if (result.data.length !== 1) throw new PaymentError(uncertainMessage, 503);
  return result.data[0].id;
}
export async function retrieveAsaasApproval(connection: AsaasConnection) {
  const result = response(z.object({ general: z.enum(["APPROVED", "PENDING", "REJECTED", "AWAITING_APPROVAL"]) }),
    await request(connection, "/myAccount/status/"));
  return result.general === "APPROVED";
}
export async function retrieveActiveRandomPix(connection: AsaasConnection) {
  const result = response(listSchema(z.object({ id: z.uuid(), key: z.string().min(1).max(160),
    type: z.enum(["EVP", "CPF", "CNPJ", "EMAIL", "PHONE"]),
    status: z.enum(["ACTIVE", "AWAITING_ACTIVATION", "AWAITING_DELETION", "AWAITING_ACCOUNT_DELETION", "DELETED", "ERROR"]) })),
  await request(connection, "/pix/addressKeys?status=ACTIVE&limit=100&offset=0"));
  const keys = result.data.filter(key => key.type === "EVP" && key.status === "ACTIVE");
  if (keys.length > 1) throw new PaymentError("Selecione explicitamente a chave Pix ativa da conta.", 409);
  return keys.length ? { id: keys[0].id, key: response(z.uuid(), keys[0].key) } : null;
}

function expiration(value: string) {
  const localDate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const normalized = localDate ? value.replace(" ", "T") + "-03:00" : value;
  if (!localDate && !z.iso.datetime({ offset: true }).safeParse(normalized).success) throw new PaymentError(uncertainMessage, 503);
  const time = Date.parse(normalized);
  if (!Number.isFinite(time) || time < Date.now() + 6_900_000 || time > Date.now() + 7_500_000) throw new PaymentError(uncertainMessage, 503);
  return new Date(time).toISOString();
}
export async function createAsaasPix(connection: AsaasConnection, input: {
  amountCents: number; externalReference: string; addressKey: string; description?: string;
}): Promise<Extract<AsaasPaymentResource, { pixQrCodeId: string }>> {
  const data = parse(z.object({ amountCents, externalReference: reference, addressKey: z.uuid(),
    description: z.string().min(1).max(140).optional() }).strict(), input);
  const result = response(z.object({ id: identifier, payload: z.string().min(1).max(5000),
    encodedImage: z.string().min(1).max(180_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
    expirationDate: z.string().max(50), allowsMultiplePayments: z.literal(false) }),
  await request(connection, "/pix/qrCodes/static", { addressKey: data.addressKey, description: data.description ?? "Pedido Wimifarma",
    value: data.amountCents / 100, format: "ALL", expirationSeconds: 7200, allowsMultiplePayments: false, externalReference: data.externalReference }));
  return { pixQrCodeId: result.id, pixCode: result.payload, pixEncodedImage: result.encodedImage,
    pixExpiresAt: expiration(result.expirationDate), allowsMultiplePayments: false };
}

const callbackSchema = z.object({ successUrl: z.url().max(2000), cancelUrl: z.url().max(2000), expiredUrl: z.url().max(2000) }).strict();
function validateCallbacks(callback: z.infer<typeof callbackSchema>) {
  const configured = process.env.AUTH_URL;
  let siteOrigin: string;
  try { siteOrigin = new URL(configured ?? "").origin; } catch { throw new PaymentError("Configure a origem do site antes do checkout Asaas.", 422); }
  for (const value of Object.values(callback)) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== siteOrigin || url.username || url.password || url.hash) {
      throw new PaymentError("URL de retorno do checkout Asaas inválida.", 422);
    }
  }
}
function checkoutLink(link: string, id: string, environment: AsaasConnection["environment"]) {
  let url: URL;
  try { url = new URL(link); } catch { throw new PaymentError(uncertainMessage, 503); }
  const host = environment === "test" ? "sandbox.asaas.com" : "asaas.com";
  const matches = (url.pathname === `/checkoutSession/show/${id}` && !url.search)
    || (url.pathname === "/checkoutSession/show" && url.search === `?id=${id}`);
  if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password || url.hash || !matches) {
    throw new PaymentError(uncertainMessage, 503);
  }
  return url.href;
}
export async function createAsaasCheckout(connection: AsaasConnection, input: {
  amountCents: number; externalReference: string; callback: z.infer<typeof callbackSchema>;
}): Promise<Extract<AsaasPaymentResource, { checkoutSessionId: string }>> {
  const data = parse(z.object({ amountCents, externalReference: reference, callback: callbackSchema }).strict(), input);
  validateCallbacks(data.callback);
  const result = response(z.object({ id: z.uuid(), link: z.string().max(2000),
    status: z.enum(["ACTIVE", "CANCELED", "EXPIRED", "PAID"]), externalReference: z.string().max(200).optional() }),
  await request(connection, "/checkouts", { billingTypes: ["CREDIT_CARD"], chargeTypes: ["DETACHED"], minutesToExpire: 120,
    externalReference: data.externalReference, items: [{ name: "Pedido Wimifarma", quantity: 1, value: data.amountCents / 100 }], callback: data.callback }));
  if (result.externalReference !== undefined && result.externalReference !== data.externalReference) throw new PaymentError(uncertainMessage, 503);
  return { checkoutSessionId: result.id, checkoutUrl: checkoutLink(result.link, result.id, connection.environment), status: result.status };
}
export async function retrieveAsaasPayment(connection: AsaasConnection, id: string): Promise<AsaasPayment> {
  parse(paymentId, id);
  const payment = response(asaasPaymentSchema, await request(connection, `/payments/${id}`));
  if (payment.id !== id) throw new PaymentError(uncertainMessage, 503);
  return payment;
}
const resourceSchema = z.union([z.object({ pixQrCodeId: identifier }).strict(), z.object({ checkoutSessionId: z.uuid() }).strict()]);
export async function listAsaasPayments(connection: AsaasConnection, resource: AsaasResourceBinding): Promise<AsaasPayment[]> {
  const binding = parse(resourceSchema, resource);
  const query = "pixQrCodeId" in binding ? `pixQrCodeId=${binding.pixQrCodeId}` : `checkoutSession=${binding.checkoutSessionId}`;
  return response(listSchema(asaasPaymentSchema), await request(connection, `/payments?${query}&limit=100&offset=0`)).data;
}
export function assertAsaasPaymentBinding(raw: unknown, expected: AsaasExpectedPayment): asserts raw is AsaasPayment {
  const payment = parse(asaasPaymentSchema, raw);
  parse(amountCents, expected.amountCents);
  const resource = parse(resourceSchema, expected.resource);
  const validMethod = expected.method === "pix" ? "pixQrCodeId" in resource && payment.billingType === "PIX"
    && payment.pixQrCodeId === resource.pixQrCodeId : expected.method === "card" && "checkoutSessionId" in resource
    && payment.billingType === "CREDIT_CARD" && payment.checkoutSession === resource.checkoutSessionId;
  // Static QR receipt references are not guaranteed to carry externalReference.
  if (!validMethod || Math.round(payment.value * 100) !== expected.amountCents
    || (expected.paymentId !== undefined && payment.id !== expected.paymentId)
    || (expected.method === "card" && expected.externalReference !== undefined && payment.externalReference !== expected.externalReference)) {
    throw new PaymentError("Pagamento Asaas não corresponde ao pedido e ao recurso persistido.", 409);
  }
}
export function selectBoundAsaasPayment(payments: unknown[], expected: AsaasExpectedPayment): AsaasPayment | null {
  if (payments.length > 1) throw new PaymentError("Mais de um pagamento Asaas encontrado. É necessária conferência.", 409);
  if (!payments.length) return null;
  assertAsaasPaymentBinding(payments[0], expected);
  return response(asaasPaymentSchema, payments[0]);
}
