import { env } from "node:process";
import { z } from "zod";
import { SITE_URL } from "@/lib/seo";
import { readBrevoSenderConfiguration, readBrevoTestRecipient, submitBrevoEmail } from "./brevo-email";
import { passwordRecoveryCodePattern, renderPasswordRecoveryEmail } from "./password-recovery-template";

const recoveryPage = `${SITE_URL}/recuperar-senha`;
const senderEmail = "pedidos@emails.wimifarma.com.br";
const sampleToken = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFG";
const recipientSchema = z.email().max(254);

function readRecoverySender(environment: Record<string, string | undefined>) {
  const configuration = readBrevoSenderConfiguration(environment);
  return configuration?.BREVO_SENDER_EMAIL === senderEmail && configuration.BREVO_SENDER_NAME === "Wimifarma" ? configuration : null;
}

export function isPasswordRecoveryEmailConfigured() {
  return env.PASSWORD_RECOVERY_EMAIL_MODE === "enabled" && Boolean(readRecoverySender(env));
}

export function getPasswordRecoveryUrl(token: string) {
  return passwordRecoveryCodePattern.test(token) ? `${recoveryPage}#token=${token}` : null;
}

async function sendRecoveryCode(recipient: string, token: string, kind: "recovery" | "verification") {
  if (env.PASSWORD_RECOVERY_EMAIL_MODE !== "enabled" || !recipientSchema.safeParse(recipient).success) return false;
  const configuration = readRecoverySender(env);
  if (!configuration) return false;

  try {
    const email = await renderPasswordRecoveryEmail(token, kind);
    if (!email) return false;
    const result = await submitBrevoEmail({ configuration, recipient, email, disablePixel: true });
    if (result.status !== "accepted") {
      console.warn("[password-recovery] Email submission did not confirm acceptance", {
        kind,
        status: result.status,
        ...(result.status === "rejected" ? { httpStatus: result.httpStatus } : {}),
      });
    }
    return result.status === "accepted";
  } catch {
    return false;
  }
}

export async function sendPasswordRecoveryEmail({ recipient, resetUrl }: { recipient: string; resetUrl: string }) {
  const token = resetUrl.slice(`${recoveryPage}#token=`.length);
  if (getPasswordRecoveryUrl(token) !== resetUrl) return false;
  return sendRecoveryCode(recipient, token, "recovery");
}

export async function sendPasswordRecoveryVerificationEmail({ recipient, token }: { recipient: string; token: string }) {
  return sendRecoveryCode(recipient, token, "verification");
}

/** Sends a display sample with an inert code to the configured internal mailbox. */
export async function sendPasswordRecoveryTestEmail(options: {
  environment?: Record<string, string | undefined>;
  fetch?: typeof fetch;
} = {}) {
  const environment = options.environment ?? env;
  if (environment.BREVO_EMAIL_MODE !== "internal_test") return { status: "disabled" } as const;
  const configuration = readRecoverySender(environment);
  const recipient = readBrevoTestRecipient(environment);
  if (!configuration || recipient !== "wimifarma@gmail.com") return { status: "invalid_config" } as const;

  try {
    const email = await renderPasswordRecoveryEmail(sampleToken);
    if (!email) return { status: "preparation_failed" } as const;
    return submitBrevoEmail({ configuration, recipient, email: { ...email, subject: `[TESTE] ${email.subject}` }, disablePixel: true, fetch: options.fetch });
  } catch {
    return { status: "preparation_failed" } as const;
  }
}
