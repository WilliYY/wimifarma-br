import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { readShippingIntegration, shippingAccessToken } from "../src/features/shipping/integration";
import { melhorEnvioRequest } from "../src/features/shipping/provider";
import { normalizeQuotes } from "../src/features/shipping/rules";
import { getSupplierPreparationEstimate } from "../src/features/supplier-catalog/preparation";

/** Diagnostic quotes only: no product mutation, order, payment or label creation. */
async function main() {
  const args = process.argv.slice(2);
  const actorId = args.includes("--actor-id") ? args[args.indexOf("--actor-id") + 1] : undefined;
  if (!actorId) throw new Error("Use --actor-id <active ADMIN>.");
  const db = getPrisma();
  try {
    if (!await db.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("Active ADMIN required.");
    const { settings } = await readShippingIntegration();
    if (!settings.enabled || settings.environment !== "production") throw new Error("Production shipping integration is not enabled.");
    const services = settings.serviceIds.filter(id => id === 1 || id === 2);
    if (!services.length) throw new Error("No configured postal service permitted for this medication diagnostic.");
    const token = await shippingAccessToken();
    const preparationDays = Math.max(settings.preparationDays, getSupplierPreparationEstimate(new Date()).preparationDays);
    const scenarios = [
      { name: "compact-250g", weightGrams: 250, widthCm: 10, heightCm: 5, lengthCm: 15 },
      { name: "compact-500g", weightGrams: 500, widthCm: 10, heightCm: 5, lengthCm: 15 },
      { name: "compact-1000g", weightGrams: 1000, widthCm: 10, heightCm: 5, lengthCm: 15 },
      { name: "large-500g", weightGrams: 500, widthCm: 20.8, heightCm: 21.6, lengthCm: 20.8 },
    ];
    const results = [];
    for (const postalCode of ["01001000", "87501070"]) {
      for (const scenario of scenarios) {
        try {
          const raw = await melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", token, {
            from: { postal_code: settings.originPostalCode }, to: { postal_code: postalCode },
            volumes: [{ width: scenario.widthCm, height: scenario.heightCm, length: scenario.lengthCm, weight: scenario.weightGrams / 1000, insurance: 20 }],
            services: services.join(","), options: { receipt: false, own_hand: false },
          });
          results.push({ postalCode, ...scenario, options: normalizeQuotes(raw, services, preparationDays) });
        } catch {
          results.push({ postalCode, ...scenario, error: "Quote failed; no product profile was enabled or changed." });
        }
      }
    }
    console.log(JSON.stringify({ observedAt: new Date().toISOString(), hypotheticalPackages: true, preparationDays, results }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Shipping diagnostic failed; check active ADMIN and the configured integration. No order or label was created."); process.exitCode = 1; });
