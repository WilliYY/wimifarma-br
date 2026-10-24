import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardOrderSummary, dashboardOrdersWhere, dashboardPurchasesWhere } from "./dashboard-metrics";

test("orders exclude sandbox payments and purchases require completion and settled production payment", () => {
  assert.deepEqual(dashboardOrdersWhere, {
    NOT: { onlinePayment: { is: { environment: "test" } } },
  });
  assert.equal(dashboardPurchasesWhere.status, "COMPLETED");
  assert.equal(dashboardPurchasesWhere.paymentStatus, "PAID");
  assert.deepEqual(dashboardPurchasesWhere.AND, [dashboardOrdersWhere, {
    OR: [
      { paymentMethod: { not: "ONLINE" }, onlinePayment: { is: null } },
      { onlinePayment: { is: {
        environment: "production", status: "PAID", financialReviewReason: null,
        OR: [{ statusDetail: null }, { NOT: { OR: ["partial", "disput", "chargeback", "refund"].map((term) => ({ statusDetail: { contains: term, mode: "insensitive" } })) } }],
      } } },
    ],
  }]);
});

test("summary distinguishes order counts from completed purchases and counts account links without identities", async () => {
  let call = 0;
  const client = { order: { count: async () => [2, 3, 1, 1][call++] } };
  const summary = await getDashboardOrderSummary(client as unknown as Parameters<typeof getDashboardOrderSummary>[0]);
  assert.deepEqual(summary, {
    orders: { total: 5, withAccount: 2, withoutAccount: 3 },
    purchases: { total: 2, withAccount: 1, withoutAccount: 1 },
  });
});

test("empty database returns zero and database failure propagates instead of fabricating zero", async () => {
  const client = { order: { count: async () => 0 } };
  const summary = await getDashboardOrderSummary(client as unknown as Parameters<typeof getDashboardOrderSummary>[0]);
  assert.equal(summary.orders.total, 0);
  assert.equal(summary.purchases.total, 0);
  client.order.count = async () => { throw new Error("synthetic database failure"); };
  await assert.rejects(getDashboardOrderSummary(client as unknown as Parameters<typeof getDashboardOrderSummary>[0]), /synthetic database failure/);
});
