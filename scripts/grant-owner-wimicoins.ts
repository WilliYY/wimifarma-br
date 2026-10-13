import { getPrisma } from "../src/lib/prisma";
import { grantOwnerWimicoins } from "../src/features/club/service";

// Uso privado no servidor. Nunca recebe identidade ou valor pelo navegador.
async function main() {
  const userId = process.env.CLUB_OWNER_USER_ID;
  if (!userId || !/^[a-zA-Z0-9_-]{1,80}$/.test(userId)) throw new Error("OWNER_ID_REQUIRED");
  const db = getPrisma();
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true, customerId: true,
      customer: { select: { status: true, clubMembership: { select: { active: true } } } } } });
    if (user?.role !== "ADMIN" || !user.isActive || !user.customerId || user.customer?.status !== "ACTIVE" || !user.customer.clubMembership?.active) throw new Error("ACTIVE_OWNER_MEMBERSHIP_REQUIRED");
    const eventKey = `club-owner-launch-2026-10-13:${userId}:500`;
    if (process.argv.includes("--confirm-owner-500")) await db.$transaction(tx => grantOwnerWimicoins(tx, { userId, eventKey, points: 500 }));
    const account = await db.wimicoinAccount.findUnique({ where: { customerId: user.customerId }, select: { balancePoints: true } });
    const credited = await db.wimicoinTransaction.count({ where: { eventKey, type: "CREDIT", amountPoints: 500, account: { customerId: user.customerId } } });
    console.log(JSON.stringify({ mode: process.argv.includes("--confirm-owner-500") ? "confirmed" : "read-only", member: true, creditedEvents: credited, balancePoints: account?.balancePoints ?? 0 }));
  } finally { await db.$disconnect(); }
}

main().catch(() => { console.error("OWNER_GRANT_FAILED"); process.exitCode = 1; });
