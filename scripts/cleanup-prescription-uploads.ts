import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { cleanupExpiredPrescriptions } from "../src/features/orders/prescription-cleanup";

async function main() {
  const args = process.argv.slice(2);
  const actorIndex = args.indexOf("--actor-id");
  const actorId = actorIndex >= 0 ? args[actorIndex + 1] : undefined;
  if (!actorId || args.some((arg, index) => arg !== "--apply" && arg !== "--actor-id" && index !== actorIndex + 1)) throw new Error("Use --actor-id <active ADMIN> [--apply]. Dry-run is the default.");
  const db = getPrisma();
  try {
    const result = await db.$transaction(tx => cleanupExpiredPrescriptions(tx, { actorId, apply: args.includes("--apply") }), { timeout: 20000 });
    console.log(JSON.stringify(result));
  } finally { await db.$disconnect(); }
}
main().catch(error => {
  if (error instanceof Error && error.message === "Active ADMIN required.") console.error("Prescription cleanup failed: active ADMIN required.");
  else if (error instanceof Error && error.message.startsWith("Use --actor-id <active ADMIN>")) console.error("Use --actor-id <active ADMIN> [--apply]. Dry-run is the default.");
  else {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : "DATABASE_OR_CONFIGURATION";
    console.error(`Prescription cleanup failed: ${code}.`);
  }
  process.exitCode = 1;
});
