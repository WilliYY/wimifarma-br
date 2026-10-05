import { createHash } from "node:crypto";

// Kept only in the encrypted, httpOnly JWT; never copied to the public session.
export function credentialVersion(passwordHash: string | null) {
  return createHash("sha256").update(passwordHash ?? "").digest("base64url");
}
