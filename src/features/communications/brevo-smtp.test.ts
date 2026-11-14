import assert from "node:assert/strict";
import { Duplex } from "node:stream";
import test from "node:test";
import type { ConnectionOptions, connect } from "node:tls";
import { sendPasswordRecoveryTestEmail } from "./password-recovery-email";
import { submitBrevoSmtpEmail } from "./brevo-smtp";

const configuration = {
  BREVO_SMTP_LOGIN: "smtp-login@example.com",
  BREVO_SMTP_KEY: "synthetic-smtp-key",
  BREVO_SENDER_EMAIL: "pedidos@example.com",
  BREVO_SENDER_NAME: "Farmácia Teste",
};

const message = {
  configuration,
  recipient: "internal@example.com",
  email: {
    subject: "Confirmação do pedido",
    text: "Seu pedido já está em separação.\nAcompanhe em Minha conta.",
    html: "<p>Seu pedido já está em separação.</p>",
  },
};

function fakeRelay(finalReply: string | null = "250 2.0.0 Queued") {
  const connections: ConnectionOptions[] = [];
  const commands: string[] = [];
  const deliveryBodies: string[] = [];

  const fakeConnect = ((options: ConnectionOptions, onSecureConnect?: () => void) => {
    connections.push(options);
    let pending = "";
    let body: string[] | undefined;

    const socket = new Duplex({
      read() {},
      write(chunk: Buffer, _encoding, done) {
        pending += chunk.toString("utf8");
        const lines = pending.split("\r\n");
        pending = lines.pop() ?? "";

        for (const line of lines) {
          if (body) {
            if (line !== ".") {
              body.push(line);
              continue;
            }
            deliveryBodies.push(body.join("\r\n"));
            body = undefined;
            if (finalReply) socket.push(`${finalReply}\r\n`);
            else queueMicrotask(() => socket.destroy());
            continue;
          }

          commands.push(line);
          const [verb] = line.split(" ");
          switch (verb) {
            case "EHLO":
              socket.push("250-local.test\r\n250-AUTH PLAIN\r\n250 SIZE 100000\r\n");
              break;
            case "AUTH":
              socket.push("235 2.7.0 Authentication successful\r\n");
              break;
            case "MAIL":
            case "RCPT":
              socket.push("250 2.1.0 OK\r\n");
              break;
            case "DATA":
              body = [];
              socket.push("354 End data with <CRLF>.<CRLF>\r\n");
              break;
            case "QUIT":
              socket.push("221 2.0.0 Bye\r\n");
              socket.push(null);
              break;
            default:
              socket.push("500 5.5.1 Unknown command\r\n");
          }
        }
        done();
      },
    });

    if (onSecureConnect) socket.once("secureConnect", onSecureConnect);
    queueMicrotask(() => {
      socket.emit("secureConnect");
      socket.push("220 local.test ESMTP\r\n");
    });
    return Object.assign(socket, { authorized: true, setTimeout: () => socket });
  }) as unknown as typeof connect;

  return { fakeConnect, connections, commands, deliveryBodies };
}

function decodeMimeBody(messageData: string, mediaType: "text/plain" | "text/html") {
  const messageLines = messageData.split("\r\n");
  const part = messageLines.findIndex((line) => line.startsWith(`Content-Type: ${mediaType};`));
  assert.notEqual(part, -1);
  const lines = messageLines.slice(part);
  const bodyStart = lines.indexOf("");
  const end = lines.findIndex((line) => line.startsWith("--"));
  assert.ok(bodyStart > 0 && end > bodyStart);
  assert.ok(lines.slice(0, bodyStart).includes("Content-Transfer-Encoding: base64"));
  return Buffer.from(lines.slice(bodyStart + 1, end).join(""), "base64").toString("utf8");
}

test("submits a Portuguese multipart message to the Brevo TLS relay and reports its explicit acceptance", { timeout: 2_000 }, async () => {
  const relay = fakeRelay();
  const result = await submitBrevoSmtpEmail(message, relay.fakeConnect);

  assert.equal(result.status, "accepted");
  assert.equal(relay.connections.length, 1);
  assert.equal(relay.connections[0].host, "smtp-relay.brevo.com");
  assert.equal(relay.connections[0].port, 465);
  assert.notEqual(relay.connections[0].rejectUnauthorized, false);

  const [ehlo, auth, ...envelope] = relay.commands;
  assert.match(ehlo, /^EHLO \S+$/);
  const credentials = Buffer.from(`\0${configuration.BREVO_SMTP_LOGIN}\0${configuration.BREVO_SMTP_KEY}`).toString("base64");
  assert.equal(auth, `AUTH PLAIN ${credentials}`);
  assert.deepEqual(envelope.slice(0, 3), [
    `MAIL FROM:<${configuration.BREVO_SENDER_EMAIL}>`,
    `RCPT TO:<${message.recipient}>`,
    "DATA",
  ]);

  assert.equal(relay.deliveryBodies.length, 1);
  const [mime] = relay.deliveryBodies;
  assert.match(mime, /^Content-Type: multipart\/alternative;/m);
  const subject = mime.match(/^Subject: =\?UTF-8\?B\?([^?]+)\?=$/im)?.[1];
  assert.ok(subject);
  assert.equal(Buffer.from(subject, "base64").toString("utf8"), message.email.subject);
  assert.equal(decodeMimeBody(mime, "text/plain"), message.email.text.replaceAll("\n", "\r\n"));
  assert.equal(decodeMimeBody(mime, "text/html"), message.email.html);
});

test("leaves delivery uncertain without resubmitting when the relay disconnects after DATA", { timeout: 2_000 }, async () => {
  const relay = fakeRelay(null);
  const result = await submitBrevoSmtpEmail(message, relay.fakeConnect);

  assert.equal(result.status, "uncertain");
  assert.equal(relay.connections.length, 1);
  assert.equal(relay.deliveryBodies.length, 1);
});

test("reports a permanent DATA rejection with the SMTP status", { timeout: 2_000 }, async () => {
  const relay = fakeRelay("554 5.7.1 Message rejected");
  const result = await submitBrevoSmtpEmail(message, relay.fakeConnect);

  assert.equal(result.status, "rejected");
  assert.equal(result.status === "rejected" && result.smtpStatus, 554);
});

test("leaves a temporary DATA failure uncertain without resubmitting", { timeout: 2_000 }, async () => {
  const relay = fakeRelay("451 4.3.0 Temporary failure");
  const result = await submitBrevoSmtpEmail(message, relay.fakeConnect);

  assert.equal(result.status, "uncertain");
  assert.equal(relay.connections.length, 1);
  assert.equal(relay.deliveryBodies.length, 1);
});

test("the recovery sample selects SMTP, limits the destination and requires its own credential", async () => {
  const relay = fakeRelay();
  const environment = {
    ...configuration, BREVO_TRANSPORT: "smtp", BREVO_EMAIL_MODE: "internal_test",
    BREVO_API_KEY: "unused-synthetic-api-key", BREVO_TEST_RECIPIENT: "wimifarma@gmail.com",
    BREVO_SENDER_EMAIL: "pedidos@emails.wimifarma.com.br", BREVO_SENDER_NAME: "Wimifarma",
  };
  let apiCalls = 0;
  const fetch: typeof globalThis.fetch = async () => {
    apiCalls++;
    return new Response(null, { status: 500 });
  };
  const send = (environment: Record<string, string>) =>
    sendPasswordRecoveryTestEmail({ environment, smtp: relay.fakeConnect, fetch });
  assert.deepEqual(await send({ ...environment, BREVO_SMTP_KEY: "" }), { status: "invalid_config" });
  assert.deepEqual(await send({ ...environment, BREVO_TEST_RECIPIENT: "other@example.com" }), { status: "invalid_config" });
  assert.equal(relay.connections.length, 0);
  assert.deepEqual(await send(environment), { status: "accepted" });
  assert.equal(apiCalls, 0);
  assert.equal(relay.connections.length, 1);
  assert.ok(relay.commands.includes("RCPT TO:<wimifarma@gmail.com>"));
  assert.match(decodeMimeBody(relay.deliveryBodies[0], "text/html"), /logo-wimifarma-email-contraste\.png/);
});
