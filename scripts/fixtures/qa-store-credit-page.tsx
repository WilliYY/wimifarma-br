import { createRoot } from "react-dom/client";
import { useState } from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { OrderShortageActions } from "../../src/components/site/order-shortage-actions";
import { CheckoutStoreCredit } from "../../src/components/site/checkout-store-credit";
import { CustomerStoreCredit } from "../../src/components/site/customer-store-credit";
import { AdminOrderShortageActions } from "../../src/components/admin/order-shortage-actions";
import type { AdminOrderRecord } from "../../src/components/admin/orders-panel";
import type { ItemShortageSummary } from "../../src/features/store-credit/contracts";

const shortage: ItemShortageSummary = { id: "shortage-synthetic", orderItemId: "item-synthetic", productName: "Produto sintético para conferência de responsividade", quantity: 1, cashPaidCents: 980, cashbackReturnCents: 100, wimicoinsReturnPoints: 20, storeCreditReturnCents: 200, status: "PROPOSED", creditState: "NONE", version: 1, createdAt: "2026-10-20T10:00:00Z", decidedAt: null };
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch: async () => {} };
function Fixture() {
  const [owner, setOwner] = useState("customer-A");
  const [selected, setSelected] = useState(0);
  const [changes, setChanges] = useState(0);
  const shortageView = location.search.includes("reversed") ? { ...shortage, status: "CREDIT_ACCEPTED" as const, creditState: "REVERSED" as const } : location.search.includes("review") ? { ...shortage, status: "CREDIT_ACCEPTED" as const, creditState: "REVIEW" as const } : shortage;
  const order = { id: "order-synthetic", updatedAt: "2026-10-20T10:00:00Z", customerId: owner, paymentStatus: "PAID", status: "PREPARING", items: [{ id: "item-synthetic", productName: shortage.productName, inventorySource: "DISTRIBUTOR", quantity: 3, shortageQuantity: 1 }], itemShortages: [] } as unknown as AdminOrderRecord;
  return <AppRouterContext.Provider value={router}><main className="mx-auto max-w-3xl space-y-5 p-4">
    <OrderShortageActions key={`shortage-${owner}`} orderId={order.id} shortages={[shortageView]} onChanged={() => setChanges(value => value + 1)} />
    <p data-testid="changes">{changes}</p>
    <CheckoutStoreCredit key={owner} capCents={1500} selectedCents={selected} onSelect={setSelected} />
    <p data-testid="selected">{selected}</p>
    <button type="button" className="min-h-11" onClick={() => { setSelected(0); setOwner("customer-B"); }}>Trocar conta sintética</button>
    <CustomerStoreCredit key={`summary-${owner}`} customerId={owner} />
    <AdminOrderShortageActions order={order} canManageCredits={!location.search.includes("staff")} />
  </main></AppRouterContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
