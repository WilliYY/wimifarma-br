import { createHash } from "node:crypto";

export function cartEmailReminderOwner(userId: string) {
  return createHash("sha256").update(`cart-email-reminder:${userId}`).digest("hex").slice(0, 24);
}
