/* eslint-disable @typescript-eslint/no-require-imports */
// QA-only preload. Never load this file into the production application.
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

function requireQa(condition) {
  if (!condition) throw new Error("EMAIL_QA_PROVIDER_GUARD_FAILED");
}

const environment = process.env;
const database = new URL(environment.DATABASE_URL || "http://invalid");
requireQa(["postgres:", "postgresql:"].includes(database.protocol));
requireQa(database.hostname === "wimifarma-br-email-qa-db" && database.pathname === "/wimifarma_email_qa");
requireQa((!database.port || database.port === "5432") && !database.search && !database.hash);
requireQa(environment.EMAIL_QA_BASE_URL === "http://wimifarma-br-email-qa-app:3000");
requireQa(environment.AUTH_SECRET?.startsWith("isolated-email-qa-"));
requireQa(environment.EMAIL_QA_CAPTURE_FILE === "/qa-state/captured.ndjson");
requireQa(environment.BREVO_TRANSPORT === "api");
requireQa(environment.BREVO_API_KEY?.startsWith("isolated-email-qa-") && environment.BREVO_API_KEY.length >= 32);
requireQa(environment.BREVO_SENDER_EMAIL === "pedidos@emails.wimifarma.com.br" && environment.BREVO_SENDER_NAME === "Wimifarma");
requireQa(environment.PASSWORD_RECOVERY_EMAIL_MODE === "enabled" && environment.CUSTOMER_ORDER_EMAIL_MODE === "enabled");
requireQa(environment.CUSTOMER_CART_EMAIL_MODE === "disabled");

const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async function qaFetch(input, init) {
  const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (target.hostname !== "brevo.com" && !target.hostname.endsWith(".brevo.com")) return originalFetch(input, init);
  requireQa(target.href === "https://api.brevo.com/v3/smtp/email");
  const request = new Request(input, init);
  requireQa(request.method === "POST" && request.headers.get("api-key") === environment.BREVO_API_KEY);
  const body = await request.json();
  requireQa(body && typeof body === "object" && !Array.isArray(body));
  requireQa(Object.keys(body).every(key => ["sender", "to", "subject", "htmlContent", "textContent"].includes(key)));
  requireQa(body.sender?.email === environment.BREVO_SENDER_EMAIL && body.sender?.name === "Wimifarma");
  requireQa(Array.isArray(body.to) && body.to.length === 1 && /^[a-z0-9._+-]+@example\.test$/i.test(body.to[0].email));
  requireQa(body.to[0].contactPixelTrackingConsent === false);
  requireQa([body.subject, body.htmlContent, body.textContent].every(value => typeof value === "string" && value.length > 0));
  const file = fs.openSync(environment.EMAIL_QA_CAPTURE_FILE, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
  try {
    const stat = fs.fstatSync(file);
    requireQa(stat.isFile() && (stat.mode & 0o077) === 0);
    fs.writeSync(file, JSON.stringify({ at: new Date().toISOString(), body }) + "\n");
  } finally {
    fs.closeSync(file);
  }
  return new Response(JSON.stringify({ messageId: `<qa-${randomUUID()}@example.test>` }), {
    status: 201, headers: { "Content-Type": "application/json" },
  });
};
