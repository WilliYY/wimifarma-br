import type { Metadata } from "next";
import { OnlinePayment } from "@/components/site/online-payment";
export const metadata: Metadata = { title: "Pagamento seguro", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OnlinePayment orderId={(await params).id} />;
}
