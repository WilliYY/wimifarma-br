import type { Prisma } from "@/generated/prisma/client";
import { ClubRuleError } from "./wallet";

export async function auditClubAutoEnrollment(tx: Prisma.TransactionClient, customerId: string, source: "CUSTOMER_CREATED" | "AUTOMATIC" = "CUSTOMER_CREATED") {
  await tx.auditLog.create({ data: { action: "CLUB_AUTO_ENROLLED", entity: "Customer", entityId: customerId, metadata: { policy: "2026-11-02", source } } });
}

export async function ensureClubMembership(tx: Prisma.TransactionClient, customerId: string): Promise<{ active: boolean }> {
  if (!customerId || customerId.length > 128) throw new ClubRuleError("Conta indisponível.", 401);
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`;
  const customer = await tx.customer.findFirst({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } });
  if (!customer) throw new ClubRuleError("Conta indisponível.", 401);
  const existing = await tx.clubMembership.findUnique({ where: { customerId }, select: { active: true } });
  // An explicitly inactive membership is never reactivated by an automatic path.
  if (existing) return existing;
  const membership = await tx.clubMembership.create({ data: { customerId }, select: { active: true } });
  await auditClubAutoEnrollment(tx, customerId, "AUTOMATIC");
  return membership;
}
