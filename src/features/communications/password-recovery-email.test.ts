import assert from "node:assert/strict";
import { test } from "node:test";
import { getPasswordRecoveryUrl, sendPasswordRecoveryTestEmail } from "./password-recovery-email";
import { renderPasswordRecoveryEmail } from "./password-recovery-template";

const code = "x".repeat(43);

test("recovery and verification display the official logo and put the code only in message content", async () => {
  for (const kind of ["recovery", "verification"] as const) {
    const email = await renderPasswordRecoveryEmail(code, kind);
    assert.ok(email);
    assert.match(email.html, /src="https:\/\/wimifarma\.com\.br\/brand\/logo-wimifarma-email-contraste\.png"/);
    assert.match(email.html, new RegExp(code));
    assert.match(email.text, new RegExp(code));
    assert.match(email.text, /15 minutos/);
    const links = [...email.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(links, [kind === "recovery" ? "https://wimifarma.com.br/recuperar-senha?codigo=1" : "https://wimifarma.com.br/minha-conta#seguranca"]);
    assert.doesNotMatch(`${email.html}\n${email.text}`, /brevo|sendinblue|token=/i);
  }
  assert.equal(await renderPasswordRecoveryEmail("<invalid>"), null);
  assert.equal(getPasswordRecoveryUrl("unsafe/secret"), null);
});

test("sample submits one branded message to the internal mailbox only after explicit test configuration", async () => {
  const environment = {
    BREVO_EMAIL_MODE: "internal_test",
    BREVO_API_KEY: "synthetic-key",
    BREVO_SENDER_EMAIL: "pedidos@emails.wimifarma.com.br",
    BREVO_SENDER_NAME: "Wimifarma",
    BREVO_TEST_RECIPIENT: "wimifarma@gmail.com",
  };
  let calls = 0;
  const fakeFetch: typeof fetch = async (url, init) => {
    calls += 1;
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.to, [{ email: "wimifarma@gmail.com", contactPixelTrackingConsent: false }]);
    assert.equal(body.contactPixelTrackingConsent, undefined);
    assert.match(body.subject, /^\[TESTE\]/);
    assert.match(body.htmlContent, /Redefinir minha senha/);
    return Response.json({ messageId: "<synthetic@example.test>" }, { status: 201 });
  };
  assert.deepEqual(await sendPasswordRecoveryTestEmail({ environment: {}, fetch: fakeFetch }), { status: "disabled" });
  assert.deepEqual(await sendPasswordRecoveryTestEmail({ environment: { ...environment, BREVO_TEST_RECIPIENT: "outside@example.test" }, fetch: fakeFetch }), { status: "invalid_config" });
  assert.deepEqual(await sendPasswordRecoveryTestEmail({ environment, fetch: fakeFetch }), { status: "accepted" });
  assert.equal(calls, 1);
});
