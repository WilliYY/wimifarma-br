import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { compare, hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { queueOrderReceivedEmail, queueOrderStatusEmail } from "../src/features/communications/order-email-events";

// No dotenv, production database, external HTTP, browser or real recipient is allowed.
const base = "http://wimifarma-br-email-qa-app:3000";
const captureFile = "/qa-state/captured.ndjson";
const checks: string[] = [];
let phase = "guards";
function requireQa(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
function check(name: string) { checks.push(name); }
type Capture = { at: string; body: { subject: string; textContent: string; to: { email: string; contactPixelTrackingConsent?: boolean }[] } };

async function captures(): Promise<Capture[]> {
  try {
    const content = await readFile(captureFile, "utf8");
    return content.split("\n").filter(Boolean).map(line => JSON.parse(line) as Capture);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("QA_CAPTURE_READ_FAILED");
  }
}

async function until<T>(read: () => Promise<T>, accept: (result: T) => boolean, code: string, timeoutMs = 95_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  do {
    const result = await read();
    if (accept(result)) return result;
    await delay(500);
  } while (Date.now() < deadline);
  throw new Error(code);
}

function client() {
  const cookies = new Map<string, string>();
  return async (path: string, init: RequestInit = {}) => {
    const target = new URL(path, base);
    requireQa(target.origin === base, "QA_HTTP_ORIGIN_REQUIRED");
    const headers = new Headers(init.headers);
    headers.set("Origin", base);
    if (cookies.size) headers.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(target, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
}
type Client = ReturnType<typeof client>;
async function post(request: Client, path: string, data: unknown) {
  return request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
async function login(email: string, password: string, expected: boolean) {
  const request = client();
  const csrfResponse = await request("/api/auth/csrf");
  requireQa(csrfResponse.status === 200, "QA_CSRF_FAILED");
  const csrf = await csrfResponse.json();
  requireQa(typeof csrf?.csrfToken === "string", "QA_CSRF_MISSING");
  await request("/api/auth/callback/credentials", { method: "POST", headers: {
    "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1",
  }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password }) });
  const sessionResponse = await request("/api/auth/session");
  requireQa(sessionResponse.status === 200, "QA_SESSION_REQUEST_FAILED");
  const session = await sessionResponse.json();
  // Auth.js returns JSON null for an anonymous or invalidated JWT session.
  requireQa(expected ? session?.user?.role === "CUSTOMER" : !session?.user, "QA_LOGIN_EXPECTATION_FAILED");
  return request;
}
async function codeFrom(subject: string, email: string) {
  const messages = await until(captures, rows => rows.some(row => row.body.subject === subject && row.body.to[0]?.email === email), "QA_SECURITY_CAPTURE_TIMEOUT", 30_000);
  const matches = messages.filter(row => row.body.subject === subject && row.body.to[0]?.email === email);
  requireQa(matches.length === 1, "QA_SECURITY_CAPTURE_DUPLICATED");
  const code = matches[0].body.textContent.split(/\s+/).find(word => /^[A-Za-z0-9_-]{43}$/.test(word));
  requireQa(code, "QA_SECURITY_CODE_MISSING");
  return code;
}

async function main() {
  const environment = process.env;
  const database = new URL(environment.DATABASE_URL ?? "http://invalid");
  requireQa(["postgres:", "postgresql:"].includes(database.protocol), "QA_DATABASE_PROTOCOL_REQUIRED");
  requireQa(database.hostname === "wimifarma-br-email-qa-db" && database.pathname === "/wimifarma_email_qa", "QA_DATABASE_REQUIRED");
  requireQa((!database.port || database.port === "5432") && !database.search && !database.hash, "QA_DATABASE_OVERRIDES_FORBIDDEN");
  requireQa(environment.EMAIL_QA_BASE_URL === base && environment.EMAIL_QA_CAPTURE_FILE === captureFile, "QA_ORIGIN_AND_CAPTURE_REQUIRED");
  requireQa(environment.AUTH_SECRET?.startsWith("isolated-email-qa-"), "QA_AUTH_SECRET_REQUIRED");
  requireQa(environment.BREVO_TRANSPORT === "api" && environment.BREVO_API_KEY?.startsWith("isolated-email-qa-") && environment.BREVO_API_KEY.length >= 32, "QA_FAKE_PROVIDER_REQUIRED");
  requireQa(environment.BREVO_SENDER_EMAIL === "pedidos@emails.wimifarma.com.br" && environment.BREVO_SENDER_NAME === "Wimifarma", "QA_SENDER_REQUIRED");
  requireQa(environment.PASSWORD_RECOVERY_EMAIL_MODE === "enabled" && environment.CUSTOMER_ORDER_EMAIL_MODE === "enabled" && environment.CUSTOMER_CART_EMAIL_MODE === "disabled", "QA_EMAIL_MODES_REQUIRED");
  const pool = new Pool({ connectionString: database.toString(), max: 3, connectionTimeoutMillis: 10_000, statement_timeout: 10_000 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const runId = randomUUID();
  const customerId = `email-qa-${runId}`;
  const revokedId = `email-qa-revoked-${runId}`;
  const orderIds: string[] = [];
  const eventKeys: string[] = [];
  const email = `customer-${runId}@example.test`;
  const password = `Qa-old-${randomUUID()}`;
  const newPassword = `Qa-new-${randomUUID()}`;
  let fixturesOwned = false;
  let totalCaptured = 0;
  try {
    phase = "pristine-database";
    // All business tables, not just Customer/Order: migrations are the only exception.
    const tables = await pool.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
    requireQa(tables.rows.length > 0, "QA_SCHEMA_REQUIRED");
    for (const { tablename } of tables.rows) {
      const table = '"' + tablename.replaceAll('"', '""') + '"';
      const result = await pool.query<{ count: string }>(`SELECT count(*) AS count FROM public.${table}`);
      requireQa(result.rows[0].count === "0", "QA_BUSINESS_DATABASE_MUST_BE_EMPTY");
    }
    requireQa((await captures()).length === 0, "QA_CAPTURE_MUST_BE_EMPTY");
    check("isolated_empty_database_and_capture");
    fixturesOwned = true;
    await db.customer.create({ data: { id: customerId, name: "Cliente sintético QA", email, passwordHash: await hash(password, 10), city: "Cidade QA" } });
    phase = "email-verification";
    const authenticated = await login(email, password, true);
    check("real_authjs_customer_login");
    requireQa((await post(authenticated, "/api/minha-conta/confirmar-email", { password })).status === 200, "QA_VERIFICATION_REQUEST_FAILED");
    const verificationCode = await codeFrom("Confirme seu e-mail na Wimifarma", email);
    const verification = await db.customerRecoveryEmailVerification.findUniqueOrThrow({ where: { customerId } });
    requireQa(verification.tokenHash === createHash("sha256").update(verificationCode).digest("hex"), "QA_VERIFICATION_HASH_REQUIRED");
    const confirmation = await post(authenticated, "/api/minha-conta/confirmar-email", { password, token: verificationCode });
    requireQa(confirmation.status === 200 && (await confirmation.json()).verified === true, "QA_VERIFICATION_FAILED");
    requireQa((await post(authenticated, "/api/minha-conta/confirmar-email", { password, token: verificationCode })).status === 400, "QA_VERIFICATION_REPLAY_ACCEPTED");
    requireQa((await db.customerRecoveryEmailVerification.findUniqueOrThrow({ where: { customerId } })).consumedAt, "QA_VERIFICATION_NOT_CONSUMED");
    check("verification_capture_hash_confirmation_and_replay_rejection");
    phase = "password-recovery-request";
    requireQa((await post(client(), "/api/minha-conta/recuperar-senha", { email })).status === 200, "QA_RECOVERY_REQUEST_FAILED");
    phase = "password-recovery-capture";
    const recoveryCode = await codeFrom("Recupere sua senha da Wimifarma", email);
    phase = "password-recovery-hash";
    const recovery = await db.customerPasswordRecovery.findUniqueOrThrow({ where: { customerId } });
    requireQa(recovery.tokenHash === createHash("sha256").update(recoveryCode).digest("hex"), "QA_RECOVERY_HASH_REQUIRED");
    const resetBody = { token: recoveryCode, password: newPassword, confirmPassword: newPassword };
    phase = "password-reset";
    requireQa((await post(client(), "/api/minha-conta/redefinir-senha", resetBody)).status === 200, "QA_RESET_FAILED");
    phase = "password-reset-replay";
    requireQa((await post(client(), "/api/minha-conta/redefinir-senha", resetBody)).status === 400, "QA_RESET_REPLAY_ACCEPTED");
    phase = "password-new-login";
    await login(email, newPassword, true);
    phase = "password-old-login-rejection";
    await login(email, password, false);
    phase = "password-hash-and-consumption";
    const updated = await db.customer.findUniqueOrThrow({ where: { id: customerId } });
    requireQa(updated.passwordHash && updated.passwordHash !== newPassword && await compare(newPassword, updated.passwordHash), "QA_PASSWORD_HASH_REQUIRED");
    requireQa((await db.customerPasswordRecovery.findUniqueOrThrow({ where: { customerId } })).consumedAt, "QA_RECOVERY_NOT_CONSUMED");
    phase = "password-old-session-rejection";
    const oldSessionResponse = await authenticated("/api/auth/session");
    requireQa(oldSessionResponse.status === 200, "QA_OLD_SESSION_REQUEST_FAILED");
    requireQa(!(await oldSessionResponse.json())?.user, "QA_OLD_SESSION_NOT_REVOKED");
    check("recovery_hash_reset_new_login_old_password_replay_and_old_session_rejection");

    phase = "order-email-worker";
    await db.customer.create({ data: { id: revokedId, name: "Destinatário sintético revogado", email: `revoked-${runId}@example.test`, city: "Cidade QA",
      passwordRecoveryVerifiedEmail: `revoked-${runId}@example.test`, passwordRecoveryVerifiedAt: new Date() } });
    async function order(id: string, owner: string, recipient: string, status: "PENDING" | "CONFIRMED" = "PENDING") {
      orderIds.push(id);
      return db.order.create({ data: { id, number: `QA-${id.slice(-36)}`, customerId: owner, customerName: "Cliente sintético QA",
        customerPhone: "00000000000", customerEmail: recipient, fulfillmentMethod: "PICKUP", paymentMethod: "CASH", status,
        subtotalCents: 1000, totalCents: 1000, privacyConsentAt: new Date(), items: { create: {
          productName: "Item sintético QA", productSlug: "item-sintetico-qa", unitPriceCents: 1000, quantity: 1, totalCents: 1000,
        } } } });
    }
    const good = await order(`email-qa-good-${randomUUID()}`, customerId, email, "CONFIRMED");
    const revoked = await order(`email-qa-revoked-${randomUUID()}`, revokedId, `revoked-${runId}@example.test`);
    const stale = await order(`email-qa-stale-${randomUUID()}`, customerId, email);
    eventKeys.push(`order-received:v1:${good.id}`, `order-status:v1:${good.id}:CONFIRMED`, `order-received:v1:${revoked.id}`, `order-status:v1:${stale.id}:CONFIRMED`, `email-qa-uncertain:${runId}`);
    await db.$transaction(async tx => {
      await tx.customer.update({ where: { id: revokedId }, data: { passwordRecoveryVerifiedEmail: null, passwordRecoveryVerifiedAt: null } });
      await queueOrderReceivedEmail(tx, good, []);
      await queueOrderStatusEmail(tx, good);
      await queueOrderReceivedEmail(tx, good, []);
      await queueOrderStatusEmail(tx, good);
      await queueOrderReceivedEmail(tx, revoked, []);
      await queueOrderStatusEmail(tx, { ...stale, status: "CONFIRMED" });
      await tx.customerEmailEvent.create({ data: { eventKey: eventKeys[4], kind: "ORDER_RECEIVED", orderId: good.id,
        state: "SENDING", claimedAt: new Date(Date.now() - 16 * 60_000) } });
    });
    requireQa(await db.customerEmailEvent.count() === 5, "QA_QUEUE_DEDUPLICATION_FAILED");
    const finalEvents = await until(() => db.customerEmailEvent.findMany({ where: { eventKey: { in: eventKeys } } }),
      rows => rows.length === 5 && rows.every(row => ["ACCEPTED", "SKIPPED", "UNCERTAIN"].includes(row.state)), "QA_WORKER_TIMEOUT");
    const expectedStates = ["ACCEPTED", "ACCEPTED", "SKIPPED", "SKIPPED", "UNCERTAIN"];
    for (let index = 0; index < eventKeys.length; index++) requireQa(finalEvents.find(row => row.eventKey === eventKeys[index])?.state === expectedStates[index], "QA_WORKER_STATE_FAILED");
    requireQa(finalEvents.every(row => row.finishedAt && row.discloseProductIds.length === 0), "QA_WORKER_FINALIZATION_FAILED");
    check("real_worker_two_accepted_revoked_and_stale_skipped_interrupted_uncertain");
    const firstCount = (await captures()).length;
    requireQa(firstCount === 4, "QA_CAPTURE_COUNT_FAILED");
    phase = "worker-second-pass";
    await delay(35_000);
    totalCaptured = (await captures()).length;
    requireQa(totalCaptured === firstCount, "QA_WORKER_DUPLICATE_SUBMISSION");
    requireQa(await db.customerEmailEvent.count({ where: { state: "UNCERTAIN" } }) === 1, "QA_UNCERTAIN_RETRIED");
    const allCaptures = await captures();
    requireQa(allCaptures.every(row => row.body.to.length === 1 && row.body.to[0].email === email && row.body.to[0].contactPixelTrackingConsent === false), "QA_CAPTURE_PRIVACY_FAILED");
    check("second_worker_pass_no_duplicates_or_uncertain_retry");
  } finally {
    try {
      if (fixturesOwned) {
        // Only identifiers allocated by this invocation; never truncate or clear other data.
        await db.customerEmailEvent.deleteMany({ where: { eventKey: { in: eventKeys } } });
        await db.order.deleteMany({ where: { id: { in: orderIds } } });
        await db.loginAttempt.deleteMany({ where: { email } });
        await db.customer.deleteMany({ where: { id: { in: [customerId, revokedId] } } });
        check("owned_synthetic_fixtures_removed");
      }
    } finally {
      try { await db.$disconnect(); }
      finally { await pool.end(); }
    }
  }
  console.log(JSON.stringify({ status: "passed", checks, captured: totalCaptured, acceptedOrderEvents: 2, skippedOrderEvents: 2, uncertainEvents: 1, realDelivery: false }));
}

void main().catch(error => {
  // Never print Prisma errors, response bodies, tokens, credentials, cookies or recipients.
  const code = error instanceof Error && /^QA_[A-Z_]+$/.test(error.message) ? error.message : "EMAIL_QA_AUDIT_FAILED";
  const knownErrorTypes = ["Error", "TypeError", "SyntaxError", "AbortError", "TimeoutError", "PrismaClientKnownRequestError", "PrismaClientValidationError"];
  const errorType = error instanceof Error && knownErrorTypes.includes(error.name) ? error.name : "OtherError";
  console.log(JSON.stringify({ status: "failed", phase, checks, error: code, errorType }));
  process.exitCode = 1;
});
