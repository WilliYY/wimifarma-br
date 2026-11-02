import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { sendBrevoTestEmail } from "./brevo-email";
import { renderCustomerEmail } from "./customer-email";
import { customerMessageSample } from "./customer-message-samples";

const configuration = {
  BREVO_EMAIL_MODE: "internal_test", BREVO_API_KEY: "synthetic-secret-key",
  BREVO_SENDER_EMAIL: "sender@example.com", BREVO_SENDER_NAME: "Wimifarma Teste",
  BREVO_TEST_RECIPIENT: "internal@example.com",
};

test("the transport rejects browser execution before reading server configuration", () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval",
    'globalThis.window = {}; await import("./src/features/communications/brevo-email.ts");',
  ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, BREVO_API_KEY: "synthetic-secret-key" } });
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /Transporte de e-mail disponível somente no servidor/);
  assert.doesNotMatch(child.stderr, /synthetic-secret-key/);
});

test("disabled by default and invalid configuration never calls the provider", async () => {
  const fetchMock: typeof fetch = async () => { throw new Error("Unexpected provider call"); };
  assert.deepEqual(await sendBrevoTestEmail({ environment: {}, fetch: fetchMock }), { status: "disabled" });
  for (const environment of [
    { ...configuration, BREVO_EMAIL_MODE: "production" },
    { ...configuration, BREVO_API_KEY: "" },
    { ...configuration, BREVO_SENDER_NAME: "sender\r\nInjected" },
    { ...configuration, BREVO_TEST_RECIPIENT: "a@example.com,b@example.com" },
    { ...configuration, BREVO_TEST_RECIPIENT: "Name <a@example.com>" },
    { ...configuration, BREVO_SENDER_EMAIL: "invalid" },
  ]) assert.deepEqual(await sendBrevoTestEmail({ environment, fetch: fetchMock }), { status: "invalid_config" });
});

test("sends only the canonical synthetic sample to the configured single recipient", async () => {
  let calls = 0;
  const email = (await renderCustomerEmail(customerMessageSample("ORDER_RECEIVED")))!;
  const result = await sendBrevoTestEmail({ environment: configuration, fetch: async (url, init) => {
    calls++;
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("api-key"), configuration.BREVO_API_KEY);
    assert.ok(init?.signal instanceof AbortSignal);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, {
      sender: { email: configuration.BREVO_SENDER_EMAIL, name: configuration.BREVO_SENDER_NAME },
      to: [{ email: configuration.BREVO_TEST_RECIPIENT }],
      subject: email.subject, htmlContent: email.html, textContent: email.text,
    });
    assert.match(body.textContent, /TESTE/);
    assert.doesNotMatch(body.htmlContent, /synthetic-secret-key|internal@example.com/);
    return new Response(JSON.stringify({ messageId: "<synthetic.123@smtp-relay.mailin.fr>" }), { status: 201 });
  } });
  assert.deepEqual(result, { status: "accepted" });
  assert.equal(calls, 1);
});

test("only 201 with a valid messageId is accepted; ambiguous responses never suggest retry", async () => {
  for (const [status, body] of [
    [200, '{"messageId":"<id@example.com>"}'], [201, "{}"], [201, "invalid JSON"],
    [201, '{"messageId":"invalid"}'], [201, '{"messageId":["<id@example.com>"]}'],
    [500, "synthetic-secret-key"], [408, "internal@example.com"], [302, "redirect"],
  ] as const) {
    let calls = 0;
    const result = await sendBrevoTestEmail({ environment: configuration, fetch: async () => {
      calls++;
      return new Response(body, { status });
    } });
    assert.equal(result.status, "uncertain");
    assert.match(JSON.stringify(result), /Não reenvie/);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-secret-key|internal@example.com|redirect|invalid JSON/);
    assert.equal(calls, 1);
  }
});

test("provider rejections are sanitized and never retried", async () => {
  for (const status of [400, 401, 403, 429]) {
    let calls = 0;
    const result = await sendBrevoTestEmail({ environment: configuration, fetch: async () => {
      calls++;
      return new Response("synthetic-secret-key internal@example.com", { status });
    } });
    assert.deepEqual(result, { status: "rejected", httpStatus: status });
    assert.equal(calls, 1);
  }
});

test("network failures and response parsing failures are uncertain without leaking exceptions", async () => {
  for (const fetchMock of [
    async () => { throw new Error("synthetic-secret-key internal@example.com"); },
    async () => new Response("synthetic-secret-key", { status: 201 }),
  ]) {
    const result = await sendBrevoTestEmail({ environment: configuration, fetch: fetchMock });
    assert.equal(result.status, "uncertain");
    assert.doesNotMatch(JSON.stringify(result), /synthetic-secret-key|internal@example.com/);
  }
});

test("a stalled provider is aborted within the fixed timeout, without retries", { timeout: 15_000 }, async () => {
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  const result = await sendBrevoTestEmail({ environment: configuration, fetch: async (_url, init) => {
    calls++;
    signal = init?.signal;
    return new Promise<Response>(() => {});
  } });
  assert.equal(result.status, "uncertain");
  assert.equal(signal?.aborted, true);
  assert.equal(calls, 1);
});
