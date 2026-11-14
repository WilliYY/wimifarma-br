import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { connect, type TLSSocket } from "node:tls";
import { z } from "zod";
import type { BrevoTestEmailResult } from "./brevo-email";

const host = "smtp-relay.brevo.com";
const mailbox = z.email().max(254);
const singleLine = /^[^\x00-\x1f\x7f]+$/;

export const smtpSenderSchema = z.object({
  BREVO_SMTP_LOGIN: mailbox,
  BREVO_SMTP_KEY: z.string().min(1).max(512).regex(/^[\x21-\x7e]+$/),
  BREVO_SENDER_EMAIL: mailbox,
  BREVO_SENDER_NAME: z.string().trim().min(1).max(100).regex(singleLine),
});

type Message = { subject: string; html: string; text: string };
type SmtpInput = { configuration: z.infer<typeof smtpSenderSchema>; recipient: string; email: Message };
type SmtpResult = Exclude<BrevoTestEmailResult, { httpStatus: number }>;

function headerWords(value: string) {
  const words: string[] = [];
  let chunk = "";
  for (const letter of value) {
    if (Buffer.byteLength(chunk + letter) > 30) {
      words.push(chunk);
      chunk = "";
    }
    chunk += letter;
  }
  words.push(chunk);
  return words.map(word => `=?UTF-8?B?${Buffer.from(word).toString("base64")}?=`).join("\r\n ");
}

function messageData({ configuration, recipient, email }: SmtpInput) {
  const boundary = randomUUID();
  const part = (kind: "plain" | "html", body: string) => [
    `--${boundary}`,
    `Content-Type: text/${kind}; charset=UTF-8`,
    "Content-Transfer-Encoding: base64",
    "",
    ...(Buffer.from(body.replace(/\r\n|\r|\n/g, "\r\n")).toString("base64").match(/.{1,76}/g) ?? []),
  ];
  return [
    `From: ${headerWords(configuration.BREVO_SENDER_NAME)}`,
    ` <${configuration.BREVO_SENDER_EMAIL}>`,
    `To: <${recipient}>`,
    `Subject: ${headerWords(email.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@wimifarma.com.br>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    ...part("plain", email.text),
    ...part("html", email.html),
    `--${boundary}--`,
    ".",
    "",
  ].join("\r\n");
}

async function* readLines(socket: TLSSocket) {
  let buffer = "";
  for await (const chunk of socket) {
    buffer += chunk.toString("latin1");
    while (buffer.includes("\r\n")) {
      const end = buffer.indexOf("\r\n");
      if (end > 512) throw new Error("SMTP_RESPONSE_LIMIT");
      yield buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
    }
    if (buffer.length > 513) throw new Error("SMTP_RESPONSE_LIMIT");
  }
}

class SmtpReplyError extends Error {
  constructor(readonly status: number) { super("SMTP_RESPONSE_UNEXPECTED"); }
}

export async function submitBrevoSmtpEmail(input: SmtpInput, openSocket = connect): Promise<SmtpResult> {
  const configuration = smtpSenderSchema.safeParse(input.configuration);
  const { email, recipient } = input;
  if (!configuration.success || !mailbox.safeParse(recipient).success || !singleLine.test(email.subject) ||
    Buffer.byteLength(email.subject) > 512 || Buffer.byteLength(email.text) + Buffer.byteLength(email.html) > 512_000) {
    return { status: "preparation_failed" };
  }
  const uncertain = (): SmtpResult => ({
    status: "uncertain",
    explanation: "Aceitação SMTP não confirmada. Confira o histórico na Brevo antes de reenviar.",
  });
  let socket: TLSSocket | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const data = messageData({ ...input, configuration: configuration.data });
    socket = openSocket({ host, port: 465, servername: host, rejectUnauthorized: true, minVersion: "TLSv1.2" });
    const connection = socket;
    deadline = setTimeout(() => connection.destroy(new Error("SMTP_TIMEOUT")), 10_000);
    const lines = readLines(connection);
    async function exchange(command: string | null, ...expected: number[]) {
      if (command !== null) connection.write(command);
      const responses: string[] = [];
      let previousCode: number | undefined;
      while (responses.length < 32) {
        const line = await lines.next();
        const reply = !line.done && /^(\d{3})([- ]?)(.*)$/.exec(line.value);
        if (!reply || (!reply[2] && reply[3])) throw new Error("SMTP_RESPONSE_INVALID");
        const code = Number(reply[1]);
        if (previousCode !== undefined && code !== previousCode) throw new Error("SMTP_RESPONSE_INVALID");
        previousCode = code;
        responses.push(reply[3]);
        if (reply[2] === "-") continue;
        if (!expected.includes(code)) throw new SmtpReplyError(code);
        return { code, responses };
      }
      throw new Error("SMTP_RESPONSE_LIMIT");
    }

    await exchange(null, 220);
    const greeting = await exchange("EHLO wimifarma.com.br\r\n", 250);
    if (!greeting.responses.some(response => /^AUTH[ =].*\bPLAIN\b/i.test(response))) return uncertain();
    const auth = Buffer.from(`\0${configuration.data.BREVO_SMTP_LOGIN}\0${configuration.data.BREVO_SMTP_KEY}`).toString("base64");
    const initialAuth = `AUTH PLAIN ${auth}\r\n`;
    const authentication = await exchange(initialAuth.length <= 512 ? initialAuth : "AUTH PLAIN\r\n", 235, 334);
    if (authentication.code === 334) await exchange(`${auth}\r\n`, 235);
    await exchange(`MAIL FROM:<${configuration.data.BREVO_SENDER_EMAIL}>\r\n`, 250);
    await exchange(`RCPT TO:<${recipient}>\r\n`, 250, 251);
    await exchange("DATA\r\n", 354);
    await exchange(data, 250);
    return { status: "accepted" };
  } catch (error) {
    if (error instanceof SmtpReplyError && error.status >= 500 && error.status < 600) {
      return { status: "rejected", smtpStatus: error.status };
    }
    return uncertain();
  } finally {
    clearTimeout(deadline);
    socket?.destroy();
  }
}
