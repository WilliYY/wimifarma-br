export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.PRODUCT_MAINTENANCE_ENABLED === "true") {
    const { startProductTrashMaintenance } = await import("@/features/products/trash-maintenance");
    startProductTrashMaintenance();
  }
}
