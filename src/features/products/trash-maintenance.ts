import { getPrisma } from "@/lib/prisma";
import { purgeExpiredProducts } from "./trash-service";

const state = globalThis as typeof globalThis & { productTrashMaintenanceStarted?: boolean };

export function startProductTrashMaintenance() {
  if (state.productTrashMaintenanceStarted) return;
  state.productTrashMaintenanceStarted = true;
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      let total = 0;
      // Bounded work per tick. Cross-process coordination uses the catalog lock.
      for (let batch = 0; batch < 10; batch++) {
        const count = await getPrisma().$transaction(tx => purgeExpiredProducts(tx), { timeout: 15000 });
        total += count;
        if (count < 100) break;
      }
      console.info("[products:retention] completed", { purged: total });
    } catch {
      console.error("[products:retention] failed; retry on next hourly tick");
    } finally { running = false; }
  }
  setTimeout(() => void run(), 30000).unref();
  setInterval(() => void run(), 60 * 60 * 1000).unref();
  console.info("[products:retention] hourly worker started");
}
