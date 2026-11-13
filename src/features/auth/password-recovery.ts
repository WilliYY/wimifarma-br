import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  getPasswordRecoveryUrl,
  isPasswordRecoveryEmailConfigured,
  sendPasswordRecoveryEmail,
  sendPasswordRecoveryVerificationEmail,
} from "@/features/communications/password-recovery-email";
import { getPrisma } from "@/lib/prisma";
import { credentialVersion } from "./credential-version";

const recoveryWindowMs = 15 * 60 * 1000;
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const credentialSelect = {
  id: true,
  email: true,
  status: true,
  passwordHash: true,
  passwordRecoveryVerifiedEmail: true,
  passwordRecoveryVerifiedAt: true,
} as const;

export const passwordRecoveryRequestSchema = z.object({
  email: z.string().trim().max(254).toLowerCase().pipe(z.email()),
}).strict();

export const passwordRecoveryResetSchema = z.object({
  token: tokenSchema,
  password: z.string().min(6).max(72).refine(password => Buffer.byteLength(password, "utf8") <= 72),
  confirmPassword: z.string().max(72),
}).strict().refine(data => data.password === data.confirmPassword);

export const passwordRecoveryVerificationSchema = z.object({
  password: z.string().min(1).max(120),
  token: tokenSchema.optional(),
}).strict();

class CredentialConflictError extends Error {}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function lockCustomer(tx: Prisma.TransactionClient, id: string) {
  // Serialize with staff access changes before taking the customer row lock.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(87164321)::text`;
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${id} FOR UPDATE`;
}

async function localCustomerIdentity(tx: Prisma.TransactionClient, customerId: string, now: Date) {
  const customer = await tx.customer.findUnique({ where: { id: customerId }, select: credentialSelect });
  if (!customer || customer.status !== "ACTIVE" || !customer.email || !customer.passwordHash ||
    customer.passwordHash === "!GOOGLE_ONLY") return null;

  const { email, passwordHash, passwordRecoveryVerifiedAt } = customer;
  const staff = await tx.user.findFirst({
    where: { OR: [{ customerId }, { email: { equals: email, mode: "insensitive" } }] },
    select: { id: true },
  });
  if (staff) return null;
  const verifiedAt = email === customer.passwordRecoveryVerifiedEmail && passwordRecoveryVerifiedAt &&
    passwordRecoveryVerifiedAt <= now ? passwordRecoveryVerifiedAt : null;
  return { email, passwordHash, verifiedAt };
}

export async function requestPasswordRecovery(email: string) {
  if (!isPasswordRecoveryEmailConfigured()) return;
  const token = randomBytes(32).toString("base64url");
  const resetUrl = getPasswordRecoveryUrl(token);
  if (!resetUrl) return;

  const db = getPrisma();
  const candidate = await db.customer.findUnique({ where: { email }, select: { id: true } });
  if (!candidate) return;

  const recipient = await db.$transaction(async tx => {
    await lockCustomer(tx, candidate.id);
    const now = new Date();
    const identity = await localCustomerIdentity(tx, candidate.id, now);
    if (!identity?.verifiedAt || identity.email !== email) return null;

    const current = await tx.customerPasswordRecovery.findUnique({ where: { customerId: candidate.id } });
    // One reservation per customer per window, including consumption and uncertain provider results.
    if (current && current.expiresAt > now) return null;
    const recovery = {
      email: identity.email,
      verifiedAt: identity.verifiedAt,
      credentialVersion: credentialVersion(identity.passwordHash),
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + recoveryWindowMs),
      consumedAt: null,
    };
    await tx.customerPasswordRecovery.upsert({
      where: { customerId: candidate.id }, create: { ...recovery, customerId: candidate.id }, update: recovery,
    });
    return identity.email;
  });

  if (recipient) await sendPasswordRecoveryEmail({ recipient, resetUrl });
}

export async function resetCustomerPassword({ token, password }: { token: string; password: string }) {
  if (!isPasswordRecoveryEmailConfigured()) return false;
  const db = getPrisma();
  const tokenHash = hashToken(token);
  const candidate = await db.customerPasswordRecovery.findUnique({ where: { tokenHash } });
  if (!candidate || candidate.consumedAt || candidate.expiresAt <= new Date()) return false;

  const passwordHash = await hash(password, 12);
  try {
    return await db.$transaction(async tx => {
      await lockCustomer(tx, candidate.customerId);
      const now = new Date();
      const current = await tx.customerPasswordRecovery.findUnique({ where: { tokenHash } });
      if (!current || current.customerId !== candidate.customerId || current.consumedAt || current.expiresAt <= now) return false;

      const identity = await localCustomerIdentity(tx, current.customerId, now);
      if (!identity?.verifiedAt || identity.email !== current.email || identity.verifiedAt.getTime() !== current.verifiedAt.getTime() ||
        credentialVersion(identity.passwordHash) !== current.credentialVersion) return false;

      const changed = await tx.customer.updateMany({
        where: { id: current.customerId, status: "ACTIVE", email: current.email, passwordHash: identity.passwordHash,
          passwordRecoveryVerifiedEmail: current.email, passwordRecoveryVerifiedAt: current.verifiedAt },
        data: { passwordHash, passwordSetAt: now },
      });
      if (changed.count !== 1) return false;

      const consumed = await tx.customerPasswordRecovery.updateMany({
        where: { customerId: current.customerId, tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new CredentialConflictError();
      return true;
    });
  } catch (error) {
    if (error instanceof CredentialConflictError) return false;
    throw error;
  }
}

export async function verifyPasswordRecoveryEmail(customerId: string, { password, token }: z.infer<typeof passwordRecoveryVerificationSchema>) {
  if (!isPasswordRecoveryEmailConfigured()) return "invalid";
  const db = getPrisma();
  const candidate = await localCustomerIdentity(db, customerId, new Date());
  if (!candidate || !await compare(password, candidate.passwordHash)) return "invalid";

  const code = token ?? randomBytes(32).toString("base64url");
  const tokenHash = hashToken(code);
  try {
    const result = await db.$transaction(async tx => {
      await lockCustomer(tx, customerId);
      const now = new Date();
      const identity = await localCustomerIdentity(tx, customerId, now);
      if (!identity || identity.email !== candidate.email || identity.passwordHash !== candidate.passwordHash) return "invalid";

      const current = await tx.customerRecoveryEmailVerification.findUnique({ where: { customerId } });
      const version = credentialVersion(identity.passwordHash);
      if (!token) {
        if (identity.verifiedAt || (current && current.expiresAt > now)) return "requested";
        const verification = { email: identity.email, credentialVersion: version, tokenHash,
          expiresAt: new Date(now.getTime() + recoveryWindowMs), consumedAt: null };
        await tx.customerRecoveryEmailVerification.upsert({
          where: { customerId }, create: { ...verification, customerId }, update: verification,
        });
        return { recipient: identity.email };
      }

      if (!current || current.consumedAt || current.expiresAt <= now || current.tokenHash !== tokenHash ||
        current.email !== identity.email || current.credentialVersion !== version) return "invalid";

      const changed = await tx.customer.updateMany({
        where: { id: customerId, status: "ACTIVE", email: identity.email, passwordHash: identity.passwordHash },
        data: { passwordRecoveryVerifiedEmail: identity.email, passwordRecoveryVerifiedAt: now },
      });
      if (changed.count !== 1) return "invalid";

      const consumed = await tx.customerRecoveryEmailVerification.updateMany({
        where: { customerId, tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new CredentialConflictError();
      return "verified";
    });
    if (typeof result === "string") return result;
    try { await sendPasswordRecoveryVerificationEmail({ recipient: result.recipient, token: code }); }
    catch { /* Keep the reservation when the outcome is uncertain. */ }
    return "requested";
  } catch (error) {
    if (error instanceof CredentialConflictError) return "invalid";
    throw error;
  }
}
