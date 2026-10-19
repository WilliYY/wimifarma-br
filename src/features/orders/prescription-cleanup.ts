import type { Prisma } from "@/generated/prisma/client";

// Explicit operational command: no scheduler, no automatic linked-record deletion.
export async function cleanupExpiredPrescriptions(tx: Prisma.TransactionClient, { actorId, apply, now = new Date() }: { actorId: string; apply: boolean; now?: Date }) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
  if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("Active ADMIN required.");
  const candidates = await tx.prescriptionUpload.findMany({ where: { orderId: null, expiresAt: { lte: now } }, select: { id: true }, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: 100 });
  let deleted = 0;
  if (apply) {
    for (const candidate of candidates) {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "PrescriptionUpload" WHERE id = ${candidate.id} AND "orderId" IS NULL AND "expiresAt" <= ${now} FOR UPDATE SKIP LOCKED`;
      if (!locked.length) continue;
      const result = await tx.prescriptionUpload.deleteMany({ where: { id: candidate.id, orderId: null, expiresAt: { lte: now } } });
      deleted += result.count;
    }
    await tx.auditLog.create({ data: { userId: actorId, action: "PRESCRIPTION_ORPHANS_CLEANED", entity: "PrescriptionUpload", metadata: { count: deleted, cutoff: now.toISOString() } } });
  }
  return { applied: apply, expiredCandidates: candidates.length, deleted, batchLimit: 100 };
}
