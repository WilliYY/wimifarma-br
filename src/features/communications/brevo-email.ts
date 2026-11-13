import { env } from "node:process";
import { z } from "zod";
import { renderCustomerEmail } from "./customer-email";
import { customerMessageSample } from "./customer-message-samples";

// The Node-only import also prevents this module from entering a Next.js client bundle.
if (typeof window !== "undefined") throw new Error("Transporte de e-mail disponível somente no servidor.");

const senderConfigurationSchema = z.object({
  BREVO_API_KEY: z.string().min(1).max(512).regex(/^[\x21-\x7e]+$/),
  BREVO_SENDER_EMAIL: z.email().max(254),
  BREVO_SENDER_NAME: z.string().trim().min(1).max(100).regex(/^[^\x00-\x1f\x7f]+$/),
});

export function readBrevoSenderConfiguration(environment: Record<string, string | undefined>) {
  const parsed = senderConfigurationSchema.safeParse(environment);
  return parsed.success ? parsed.data : null;
}

export function readBrevoTestRecipient(environment: Record<string, string | undefined>) {
  const parsed = z.email().max(254).safeParse(environment.BREVO_TEST_RECIPIENT);
  return parsed.success ? parsed.data : null;
}

export type BrevoTestEmailResult =
  | { status: "disabled" | "invalid_config" | "preparation_failed" | "accepted" }
  | { status: "rejected"; httpStatus: number }
  | { status: "uncertain"; explanation: string };

const uncertain = (): BrevoTestEmailResult => ({
  status: "uncertain",
  explanation: "Não foi possível confirmar a aceitação. Não reenvie antes de conferir o histórico transacional na Brevo.",
});

/** Internal homologation only: no customer input, database, real event or automatic retry. */
export async function sendBrevoTestEmail(options: {
  environment?: Record<string, string | undefined>;
  fetch?: typeof fetch;
} = {}): Promise<BrevoTestEmailResult> {
  const environment = options.environment ?? env;
  const mode = environment.BREVO_EMAIL_MODE ?? "disabled";
  if (mode === "disabled") return { status: "disabled" };
  if (mode !== "internal_test") return { status: "invalid_config" };
  const configuration = readBrevoSenderConfiguration(environment);
  const recipient = readBrevoTestRecipient(environment);
  if (!configuration || !recipient) return { status: "invalid_config" };

  let email;
  try {
    email = await renderCustomerEmail(customerMessageSample("ORDER_RECEIVED"));
  } catch {
    return { status: "preparation_failed" };
  }
  if (!email) return { status: "preparation_failed" };

  return submitBrevoEmail({ configuration, recipient, email, fetch: options.fetch });
}

export async function submitBrevoEmail(options: {
  configuration: z.infer<typeof senderConfigurationSchema>;
  recipient: string;
  email: { subject: string; html: string; text: string };
  disablePixel?: boolean;
  fetch?: typeof fetch;
}): Promise<BrevoTestEmailResult> {
  const { configuration, recipient, email } = options;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<BrevoTestEmailResult>((resolve) => {
    timeout = setTimeout(() => { controller.abort(); resolve(uncertain()); }, 10_000);
  });
  const submit = async (): Promise<BrevoTestEmailResult> => {
    try {
      const response = await (options.fetch ?? fetch)("https://api.brevo.com/v3/smtp/email", {
        method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
        headers: { "api-key": configuration.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: { email: configuration.BREVO_SENDER_EMAIL, name: configuration.BREVO_SENDER_NAME },
          to: [{ email: recipient }],
          subject: email.subject, htmlContent: email.html, textContent: email.text,
          ...(options.disablePixel ? { contactPixelTrackingConsent: false } : {}),
        }),
      });
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        return { status: "rejected", httpStatus: response.status };
      }
      if (response.status !== 201) return uncertain();
      const body: unknown = await response.json();
      const messageId = body && typeof body === "object" && "messageId" in body ? body.messageId : null;
      if (typeof messageId !== "string" || messageId.length > 254 || !/^<[^<>\s@]+@[^<>\s@]+>$/.test(messageId)) return uncertain();
      // Accepted by Brevo is not delivery. Do not return arbitrary provider data.
      return { status: "accepted" };
    } catch {
      return uncertain();
    }
  };
  try {
    return await Promise.race([submit(), deadline]);
  } finally {
    clearTimeout(timeout);
  }
}
