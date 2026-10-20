import { publicPaymentConfiguration } from "@/features/payments/integration";
import { FooterPaymentMethodsContent } from "./footer-payment-methods-content";

export async function FooterPaymentMethods() {
  try {
    const configuration = await publicPaymentConfiguration(false);
    return <FooterPaymentMethodsContent brands={configuration?.brands ?? []} fromMercadoPago={Boolean(configuration?.publicKey)} />;
  } catch {
    console.warn("[footer] payment-brands-unavailable");
    return <FooterPaymentMethodsContent />;
  }
}
