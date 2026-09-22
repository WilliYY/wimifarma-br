import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Toaster } from "sonner";
import { CustomerAccountPanel } from "../../src/components/site/customer-account-panel";
import { accountCashback, accountCustomer, accountHistory } from "./account-data";

const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch: async () => {} };
createRoot(document.getElementById("root")!).render(<AppRouterContext.Provider value={router}>
  <CustomerAccountPanel adminAccess cashback={accountCashback} customer={accountCustomer} initialOrders={accountHistory(1, "all", location.search.includes("empty"))} />
  <Toaster />
</AppRouterContext.Provider>);
