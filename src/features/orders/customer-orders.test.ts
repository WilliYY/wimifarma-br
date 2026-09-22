import assert from "node:assert/strict";
import test from "node:test";
import { getOrderTracking, parseOrderHistoryQuery } from "./customer-orders";
import { getCustomerOrders } from "./customer-orders-service";

test("history query validates bounded pages and supported filters", () => {
  assert.deepEqual(parseOrderHistoryQuery(new URLSearchParams()), { page: 1, filter: "all" });
  assert.deepEqual(parseOrderHistoryQuery(new URLSearchParams("page=2&filter=active")), { page: 2, filter: "active" });
  for (const query of ["page=0", "page=-1", "page=1.5", "page=1001", "page=NaN", "filter=PAID"]) {
    assert.equal(parseOrderHistoryQuery(new URLSearchParams(query)), null);
  }
});

test("tracking differentiates pickup and delivery without fabricating timestamps", () => {
  for (const method of ["DELIVERY", "PICKUP"] as const) {
    for (const status of ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"] as const) {
      const tracking = getOrderTracking(status, method);
      assert.ok(tracking.label && tracking.description);
      assert.equal(tracking.canceled, status === "CANCELED");
      if (status === "CANCELED") assert.equal(tracking.currentStep, -1);
      if (status === "COMPLETED") assert.equal(tracking.currentStep, tracking.steps.length - 1);
    }
  }
  assert.match(getOrderTracking("READY", "PICKUP").label, /retirada/);
  assert.match(getOrderTracking("READY", "DELIVERY").label, /entrega/);
  assert.equal(getOrderTracking("OUT_FOR_DELIVERY", "DELIVERY").steps[3], "Em entrega");
  assert.ok(!getOrderTracking("READY", "PICKUP").steps.includes("Em entrega"));
});

test("all order reads are scoped to session customer and exclude private notes", async () => {
  const calls: Array<{ operation: string; args: Record<string, unknown> }> = [];
  const db = { order: {
    count: async (args: Record<string, unknown>) => { calls.push({ operation: "count", args }); return 0; },
    findMany: async (args: Record<string, unknown>) => { calls.push({ operation: "findMany", args }); return []; },
    findFirst: async (args: Record<string, unknown>) => { calls.push({ operation: "findFirst", args }); return null; },
  } };
  const result = await getCustomerOrders(db as never, "customer-A", { page: 2, filter: "active" });
  assert.equal(result.page, 2);
  for (const { args } of calls) assert.equal((args.where as { customerId: string }).customerId, "customer-A");
  const list = calls.find(call => call.operation === "findMany")!.args;
  assert.equal(list.take, 8);
  assert.equal(list.skip, 8);
  assert.equal((list.select as Record<string, unknown>).notes, undefined);
  assert.equal((list.select as Record<string, unknown>).customerPhone, undefined);
  assert.equal((list.select as Record<string, unknown>).customerEmail, undefined);
  assert.deepEqual((list.where as { status: unknown }).status, { notIn: ["COMPLETED", "CANCELED"] });
  await assert.rejects(() => getCustomerOrders(db as never, "", { page: 1, filter: "all" }));
});
