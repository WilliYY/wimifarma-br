import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { ProductsCatalogPanel } from "../../src/components/admin/products-catalog-panel";

createRoot(document.getElementById("root")!).render(
  <main className="min-h-screen bg-surface-subtle p-4 sm:p-8">
    <ProductsCatalogPanel canManageCashback />
    <Toaster />
  </main>,
);
